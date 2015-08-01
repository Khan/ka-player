angular.module("ka-player.services", [
    'LocalStorageModule'
])

/**
 * Utilities to create a new Program object. A program object is a collection
 * of metadata about a program we're interested in showing information about.
 */
.factory('programFactory', function($http, $q){
    var factory = {

        /**
         * Creates a program from the given metadata. Just adds some custom
         * features to the metadata, like whether it's a favorite or not.
         * This is useful if you're already loading a bunch of metadata from
         * the API.
         * @param  {Object} metadata Contains fields like:
         *                           - id : String
         *                           - title: String
         *                           - voteCount : int
         *                           - spinoffCount : int
         */
        createProgram: function(metadata){
            // add some extra features to the program
            var program = _.clone(metadata);
            // whether the program has been saved as a favorite
            program.favorite = false;
            // thumbnail URL
            program.imageURL = idToImageUrl(program.id);
            // the last time the program was played
            program.lastPlayed = Date.now();

            return program;
        },

        /**
         * Creates a new program from nothing more than its ID. Users will
         * often just enter the ID of a program, but we need more metadata.
         * Therefore, this makes an API call to retrieve more information
         * about the program.
         * @param  {int} id a numeric identifier of the program.
         * @return {Promise}    returns a program object when it resolves.
         *                      But if the API returned an error, the promise
         *                      rejects.
         */
        createProgramFromId: function(id) {
            // $http doesn't return a proper promise so we need to make
            // a custom one
            var deferred = $q.defer();

            // grab more metadata by querying khanacademy.org
            $http.jsonp('https://www.khanacademy.org/api/internal/scratchpads/' +
                    id + '?callback=JSON_CALLBACK')
                .success(function(data, status, headers, config) {
                    var metadata = {
                        id: id,
                        title: data.title,
                        description: data.descriptionHtml,
                        voteCount: data.sumVotesIncremented,
                        spinoffCount: data.spinoffCount,
                        imageURL: idToImageUrl(id),
                    };

                    // now we need to do some further processing of the metadata,
                    // so pass it to the other handler
                    var finishedProgram = factory.createProgram(metadata);
                    deferred.resolve(finishedProgram);
                })
                .error(function(data, status, headers, config){
                    deferred.reject();
                });

            return deferred.promise;
        },

    };

    return factory;
})

/**
 * Contains all your programs and methods to manage them.
 * Only add a program here if you're intent on playing it.
 * A data store of programs the user has played or has favorited.
 */
.factory('programsService', function($http, programFactory, $q, $rootScope, localStorageService) {

  $rootScope.programs = [];
  var LOCALSTORAGE_KEY = 'programs';

  var service = {
      // manipulate the data store on localStorage
      /**
       * Saves the current list of programs to localStorage.
       */
      _updateLocalStorage: function(){
          localStorageService.set(LOCALSTORAGE_KEY, $rootScope.programs);
      },

      /**
      * Loads all programs from localStorage, if any exist.
      * @return {boolean} true if there were programs stored in LocalStorage,
      *                   false otherwise.
      */
      _loadFromLocalStorage: function() {
          var storedPrograms = localStorageService.get(LOCALSTORAGE_KEY);
          if (storedPrograms && !_.isEmpty(storedPrograms)) {
              $rootScope.programs = storedPrograms;
              return true;
          } else {
              return false;
          }
      },

      /**
       * Cleans out the data store by removing all programs that are not
       * favorites. This is helpful when restarting the app, as we only
       * show the user their favorite programs, so we non-favorite ones will
       * just pile up and eat up space without providing any use.
       */
      _removeNonFavorites: function() {
          $rootScope.programs = _.filter($rootScope.programs, function(program){
              return program.favorite;
          });
      },

      // user-facing
      /**
       * Returns all programs that have been stored.
       * @return {Program[]}
       */
      getAllPrograms: function() {
          return $rootScope.programs;
      },

      /**
       * Returns true if the given program exists in the store.
       * @param  {Object} program
       * @return {boolean}         whether any program with the given id
       *                           exists in the store.
       */
      hasProgram: function(program) {
          return _.find($rootScope.programs, function(iteratee) {
              return program.id === iteratee.id;
          }) !== undefined;
      },

      /**
       * Returns the program with the given ID. The program must, of course,
       * exist within the programs store. Use loadProgram() to add a program
       * to the list.
       */
      getProgramById: function(programId) {
          return _.find($rootScope.programs, function(program) {
              return program.id === programId;
          });
      },

      /**
       * Fetches information about a program with the given ID, and stores
       * metadata about it in the programs list. Use this to add a new
       * program to the program store.
       *
       * If the program already exists in the program store, it will not
       * be re-fetched, and the cached version will be given back.
       *
       * @param  {int} programId    The ID of a program to add to the store.
       * @return {Promise}    Resolves once the program has been added. Returns
       *                      the program with the given ID.
       */
      addProgramById: function(programId) {
          var deferred = $q.defer();

          // don't fetch if the program exists in the store
          var storedProgram = service.getProgramById(programId);
          if (storedProgram) {
              // resolve immediately to the program
              deferred.resolve(storedProgram);
          } else {
              // fetch metadata
              programFactory.createProgramFromId(programId)
                  .then(function(newProgram) {
                      service.insertProgram(newProgram);
                      deferred.resolve(newProgram);
                  });
          }

          return deferred.promise;
      },


      // the following methods mutate the state of the programs

      /**
       * Adds the given program to the data store and updates localStorage.
       * If any program with this ID already exists, overwrites it.
       */
      insertProgram: function(newProgram) {
          // remove any program with this id
          $rootScope.programs = _.reject($rootScope.programs, function(program) {
              return program.id === newProgram.id;
          });
          $rootScope.programs.push(newProgram);
          service._updateLocalStorage();
      },
  };

  // load programs from localStorage if they exist
  var wasStored = service._loadFromLocalStorage();

  // if there's nothing stored, load a bunch of default programs
  if (!wasStored) {
      // add in a bunch of default programs
      var defaultIds = [
          6095780544249856, // Guess my number 2
          5238695889338368, // What apples are great for
          5995007307677696, // Mini Putt
          938561708, // Mercury subspace
          6539939794780160 // Squirtle/Wartortle/Blastoise
      ];
      var programPromises = _.map(defaultIds, service.addProgramById);
      $q.all(programPromises)
          .then(function(programs) {
              // make these all favorites
              _.each(programs, function(program) {
                  program.favorite = true;
              });
          });
  }

  // update the stored programs whenever a program is added, removed, favorited,
  // etc.
  // last parameter is true so that we watch deeply
  $rootScope.$watch('programs', function(){
      service._updateLocalStorage();
  }, true)

  // clean out any non-favorited programs to save space. only do this on
  // startup, as we know that you're not currently playing any programs
  // at this state.
  service._removeNonFavorites();

  return service;
})
