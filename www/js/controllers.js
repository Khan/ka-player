angular.module("starter.controllers", [])
.config(function ($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist(['self', '*khanacademy.org*', 'http://www.khanacademy.org/', 'https://www.khanacademy.org/', 'http://khanacademy.org/', 'https://khanacademy.org/']);
})
.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  // // Form data for the login modal
  // $scope.loginData = {};
  //
  // // Create the login modal that we will use later
  // $ionicModal.fromTemplateUrl('templates/login.html', {
  //   scope: $scope
  // }).then(function(modal) {
  //   $scope.modal = modal;
  // });
  //
  // // Triggered in the login modal to close it
  // $scope.closeLogin = function() {
  //   $scope.modal.hide();
  // };
  //
  // // Open the login modal
  // $scope.login = function() {
  //   $scope.modal.show();
  // };
  //
  // // Perform the login action when the user submits the login form
  // $scope.doLogin = function() {
  //   console.log('Doing login', $scope.loginData);
  //
  //   // Simulate a login delay. Remove this and replace with your login
  //   // code if using a login system
  //   $timeout(function() {
  //     $scope.closeLogin();
  //   }, 1000);
  // };
})


.controller('BrowseCtrl', function($scope, $http, programFactory) {
    // generate a list of interesting categories (most recent, most popular,
    // etc.) and fetch programs within those
    // a mapping of category name to their sort key for use with
    // khanacademy's API
    var categoryMap = {
        "hot": 3,
        "recent": 2,
        "contest": 4,
        "top": 5
    };

    $scope.doRefresh = function() {
      // generate $scope.categories.hot, $scope.categories.recent, etc.
      // each one will be the key, with the value being the list of programs
      $scope.categories = {};
      _.each(categoryMap, function(sortKey, categoryName) {
          $http.jsonp("https://www.khanacademy.org/api/internal/scratchpads/top?" +
                  "casing=camel&topic_id=xffde7c31&sort=" + sortKey +
                  "&limit=20&page=0&callback=JSON_CALLBACK")
              .success(function(data, status, headers, config) {
                  // data.scratchpads contains a list of programs, which we must
                  // convert to our format
                  var programs = _.map(data.scratchpads, function(scratchpad, key) {
                      return programFactory.createProgram({
                          id: extractIdFromUrl(scratchpad.url),
                          title: scratchpad.title,
                          voteCount: scratchpad.sumVotesIncremented,
                          spinoffCount: scratchpad.spinoffCount,
                      });
                  });

                  $scope.categories[categoryName] = programs;
              })
              .finally(function() {
                // stops the ion-refresher from spinning
                $scope.$broadcast('scroll.refreshComplete');
              });
      });
    }
    // we call our refresh once so it loads on the original call
    $scope.doRefresh();
})

.controller('SearchCtrl', function($scope, $http, programFactory, programsService, $ionicLoading) {

  $http.jsonp("https://www.khanacademy.org/api/internal/scratchpads/top?" +
                "casing=camel&topic_id=xffde7c31&sort=5&limit=500&page=0&callback=JSON_CALLBACK")
    .success(function(data, status, headers, config) {
        // data.scratchpads contains a list of programs, which we must
        // convert to our format
        var programs = _.map(data.scratchpads, function(scratchpad, key) {
            return programFactory.createProgram({
                id: extractIdFromUrl(scratchpad.url),
                title: scratchpad.title,
                voteCount: scratchpad.sumVotesIncremented,
                spinoffCount: scratchpad.spinoffCount,
            });
        });

        $scope.programs = programs;
    })
    .finally(function() {
      // hide the ionic loading page
      $ionicLoading.hide();
    });
})

.controller('FavoritesCtrl', function($scope, programsService) {
  $scope.programs = programsService.getAllPrograms();
})

.controller('AddCtrl', function($scope, $http) {
    /**
     * Called whenever the inputted program URL is updated.
     * Updates the thumbnail and URL of the program whose URL was inputted.
     * TODO(neel): grab more related metadata.
     */
    $scope.onUpdateURL = function(programURL) {
        var programId = extractIdFromUrl(programURL);
        $scope.programId = programId;
        $scope.thumbnailUrl = idToImageUrl(programId);
    };
})

/**
 * Handles playing a particular program.
 */
.controller('PlayerCtrl', function($scope, $stateParams, $sce, programsService) {
    var programId = parseInt($stateParams.programId);
    // the id of the program to be rendered here
    $scope.programId = programId;

    // grab the program itself. we'll need to add it to the programsService
    // data store.
    programsService.addProgram(programId).then(function(program){
        $scope.program = program;
    });

    // make the iframe at most as wide as the window
    var windowWidth = angular.element(window).width();
    var windowHeight = angular.element(window).height();
    // KA programs get 400 pixels to work with, so they need at least that
    // (any less and they get truncated)
    var MIN_IFRAME_SIZE = 400;

    var scaleFactor = 1;
    var iframeSize = MIN_IFRAME_SIZE;

    // if the window is larger than the program, keep it the same size:
    // if we scale it up then it gets pixelated, if we give the iframe more
    // room the program may break since it may rely on being 400x400 -- so
    // the program can grow no larger than 400x400
    // if (windowWidth > MIN_IFRAME_SIZE && windowHeight > MIN_IFRAME_SIZE) {
    //     iframeSize = Math.min(windowWidth, windowHeight);
    // }

    // if the window is too small to fit the program, you can't reduce its
    // width or height, as that'd just truncate the program. instead, scale it
    // down to simulate it being shrunk.
    // keep width & height the same to maintain square aspect ratio.
    if (windowWidth < MIN_IFRAME_SIZE || windowHeight < MIN_IFRAME_SIZE) {
        scaleFactor = Math.min(windowWidth, windowHeight) / MIN_IFRAME_SIZE;
    }

    $scope.iframeSize = iframeSize;
    $scope.scaleFactor = scaleFactor;

    console.log("Rendering program at size " + iframeSize +
        " and scale " + scaleFactor);

    // angular usually won't let us interpolate a variable in an iframe url.
    // we need to manually specify that it's trusted.
    // from http://stackoverflow.com/q/20045150/4839084
    $scope.url = $sce.trustAsResourceUrl(
        "https://www.khanacademy.org/computer-programming/ka-player/" +
        programId + "/embedded?embed=yes&article=yes&editor=no&buttons=no" +
        "&author=no&autoStart=yes&width=" + iframeSize +
        "&height=" + iframeSize);

    $scope.program = programsService.getProgramById(programId);
    $scope.markFavorite = function() {
        // TODO(chelsea): This doesn't work!
        $scope.program.favorite = !$scope.program.favorite;
    }
})
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

            return program;
        },

        /**
         * Creates a new program from nothing more than its ID. Users will
         * often just enter the ID of a program, but we need more metadata.
         * Therefore, this makes an API call to retrieve more information
         * about the program.
         * @param  {int} id a numeric identifier of the program.
         * @return {Promise}    returns a program object when it resolves.
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
                });

            return deferred.promise;
        },

    };

    return factory;
})

/**
 * Adding an ion search directive taken from http://codepen.io/gastonbesada/pen/eqvJK
 */

.directive('ionSearch', function() {
  return {
      restrict: 'E',
      replace: true,
      scope: {
          getData: '&source',
          model: '=?',
          search: '=?filter'
      },
      link: function(scope, element, attrs) {
          attrs.minLength = attrs.minLength || 0;
          scope.placeholder = attrs.placeholder || '';
          scope.search = {value: ''};

          if (attrs.class)
              element.addClass(attrs.class);

          scope.clearSearch = function() {
              scope.search.value = '';
          };
      },
      template: '<div class="item-input-wrapper">' +
                  '<i class="icon ion-android-search"></i>' +
                  '<input type="search" placeholder="{{placeholder}}" ng-model="search.value">' +
                  '<i ng-if="search.value.length > 0" ng-click="clearSearch()" class="icon ion-close"></i>' +
                '</div>'
  };
})
/**
 * Contains all your programs and methods to manage them.
 * Only add a program here if you're intent on playing it.
 * A data store of programs the user has played or has favorited.
 */
.factory('programsService', function($http, programFactory, $q) {

  var programs = [];

  var service = {
      /**
       * Returns all programs that have been stored.
       * @return {Program[]}
       */
      getAllPrograms: function() {
          return programs;
      },

      /**
       * Returns the program with the given ID. The program must, of course,
       * exist within the programs store. Use loadProgram() to add a program
       * to the list.
       */
      getProgramById: function(programId) {
          return _.find(programs, function(program){
              return program.id === programId;
          });
      },

      /**
       * Adds the given program to the data store.
       */
      _insertProgram: function(program){
          programs.push(program);
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
      addProgram: function(programId) {
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
                      service._insertProgram(newProgram);
                      deferred.resolve(newProgram);
                  });
          }

          return deferred.promise;
      },
  };

  // add in a bunch of default programs
  var defaultIds = [
      6095780544249856,
      5238695889338368,
      5406513695948800,
      6539939794780160
  ];
  var programPromises = _.map(defaultIds, service.addProgram);
  $q.all(programPromises)
    .then(function(programs){
        // make these all favorites
        _.each(programs, function(program){
            program.favorite = true;
        });
    });
  //
  // // for testing
  // _.delay(function(){
  //     programFactory.createProgramFromId(5536800924893184).then(function(program){
  //         console.log("Adding", program.title);
  //         service.addProgram(program);
  //         program.favorite = true;
  //     });
  // }, 5000);

  return service;
})
/**
 * Renders a list item for a particular program.
 */
.directive("kaplayerProgramListItem", function() {
  return {
    scope: {
      program: '=program'
    },
    templateUrl: "templates/kaplayer-program-list-item.html"
  }
});

var extractIdFromUrl = function(url) {
    // program url is in format
    // https://www.khanacademy.org/computer-programming/[slug]/[id]
    // and we only care about the id
    var urlChunks = url.split("/");
    return urlChunks.slice(-1)[0];
}

var idToImageUrl = function(id) {
    return "https://www.khanacademy.org/computer-programming/ka-player/"+id+"/latest.png";
}
