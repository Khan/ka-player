angular.module("ka-player.controllers", [])
.controller('AppCtrl', function($scope) {

})

.controller('MakeYourOwnCtrl', function($scope) {

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

    $scope.categories = {};

    $scope.doRefresh = function() {
      // generate $scope.categories.hot, $scope.categories.recent, etc.
      // each one will be the key, with the value being the list of programs
      _.each(categoryMap, function(sortKey, categoryName) {
          $http.jsonp("https://www.khanacademy.org/api/internal/scratchpads/top?" +
                  "casing=camel&topic_id=xffde7c31&sort=" + sortKey +
                  "&limit=20&callback=JSON_CALLBACK")
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
                  $scope.categories[categoryName] = {
                      'programs': programs,
                      'cursor': data.cursor,   // This allows us to fetch more
                  };
              })
              .finally(function() {
                // stops the ion-refresher from spinning
                $scope.$broadcast('scroll.refreshComplete');
              });
      });
    }
    // we call our refresh once so it loads on the original call
    $scope.doRefresh();

    $scope.loadMore = function(categoryName) {
      // An infinite scroll is detected before we load any content,
      // so, don't do that if no content has loaded
      if (! (categoryName in $scope.categories)) {
        $scope.$broadcast('scroll.infiniteScrollComplete');
        return;
      }
      var sortKey = categoryMap[categoryName];
      var categoriesObject = $scope.categories[categoryName];
      var cursor = categoriesObject.cursor;
      $http.jsonp("https://www.khanacademy.org/api/internal/scratchpads/top?" +
                "casing=camel&topic_id=xffde7c31&sort=" + sortKey +
                "&limit=20&callback=JSON_CALLBACK&cursor=" + cursor)
        .success(function(data, status, headers, config) {
          var programs = _.map(data.scratchpads, function(scratchpad, key) {
            return programFactory.createProgram({
              id: extractIdFromUrl(scratchpad.url),
              title: scratchpad.title,
              voteCount: scratchpad.sumVotesIncremented,
              spinoffCount: scratchpad.spinoffCount,
            });
          });
          categoriesObject.programs = categoriesObject.programs.concat(programs);
          categoriesObject.cursor = data.cursor;
          $scope.$broadcast('scroll.infiniteScrollComplete');
        });
  };
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

.controller('AddCtrl', function($scope, $http, programFactory, programsService) {
    // the program that has been found from the search field
    $scope.program = null;
    // whether the program is currently being loaded
    $scope.loading = false;

    /**
     * Called whenever the inputted program URL is updated.
     * Attempts to grab information
     */
    var onUpdateURL = function(programURL) {
        // try loading a program from the given URL
        var programId = extractIdFromUrl(programURL);
        $scope.loading = true;
        programFactory.createProgramFromId(programId)
            .finally(function(){
                // turn off the loading flag now (instead of after setting
                // the program value) since the template checks first if it's
                // still loading
                $scope.loading = false;
            })
            .then(function(program){
                $scope.program = program;
            })
            .catch(function(){
                // the ID didn't match a program on khan academy
                $scope.program = null;
            });
    };
    $scope.onUpdateURL = _.throttle(onUpdateURL, 1000);

    /**
     * Adds the current program to the data store and favorites it.
     */
    $scope.addFavorite = function(){
        $scope.program.favorite = true;
        programsService.insertProgram($scope.program);
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
    programsService.addProgramById(programId).then(function(program){
        $scope.program = program;
    });

    /**
    * Resizes the program to fit the current screen size.
    */
    function fitProgramToScreen(){
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
        // width or height, as that'd just truncate the program. instead, scale
        // it down to simulate it being shrunk.
        // keep width & height the same to maintain square aspect ratio.
        if (windowWidth < MIN_IFRAME_SIZE || windowHeight < MIN_IFRAME_SIZE) {
            scaleFactor = Math.min(windowWidth, windowHeight)
                / MIN_IFRAME_SIZE;
        }

        $scope.iframeSize = iframeSize;
        $scope.scaleFactor = scaleFactor;

        console.log("Rendering program at size " + iframeSize +
            " and scale " + scaleFactor);
    }

    // make the program fit initially, of course
    fitProgramToScreen();

    // re-fit the program whenever the window is resized (e.g. when the phone
    // is turned from landscape to portrait)
    angular.element(window).off('resize').on('resize',
        _.throttle(fitProgramToScreen, 1000));

    function updateIframeURL(){
        // angular usually won't let us interpolate a variable in an iframe url.
        // we need to manually specify that it's trusted.
        // from http://stackoverflow.com/q/20045150/4839084
        // and add a dummy query parameter so that we can programmatically
        // refresh the iframe by making a trivial update to the URL.
        $scope.url = $sce.trustAsResourceUrl(
            "https://www.khanacademy.org/computer-programming/ka-player/" +
            programId + "/embedded?embed=yes&article=yes&editor=no&buttons=no" +
            "&author=no&autoStart=yes&width=" + $scope.iframeSize +
            "&height=" + $scope.iframeSize + "&dummy=" + Date.now());
    }

    updateIframeURL();

    $scope.markFavorite = function() {
        $scope.program.favorite = !$scope.program.favorite;
    }

    $scope.refreshIframe = function() {
        // angular will re-render the iframe if the URL changes, which is
        // just what we need
        updateIframeURL();
    }
})

var extractIdFromUrl = function(url) {
    // program url is in format
    // https://www.khanacademy.org/computer-programming/[slug]/[id]
    // and we only care about the id
    var urlChunks = url.split("/");
    var stringId = urlChunks.slice(-1)[0];
    return parseInt(stringId);
}

var idToImageUrl = function(id) {
    return "https://www.khanacademy.org/computer-programming/ka-player/"+id+"/latest.png";
}
