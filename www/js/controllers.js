angular.module('starter.controllers', [])

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


.controller('BrowseCtrl', function($scope, $http) {
  $scope.hot_programs = {
      "sort": 3, //SORT_HOT
      "programs": [],
  };
  $scope.recent_programs = {
      "sort": 2, //SORT_RECENT
      "programs": [],
  };
  $scope.contest_programs = {
      "sort": 4, //SORT_OFFICIAL
      "programs": [],
  };
  $scope.top_programs = {
      "sort": 5, //SORT_UPVOTE
      "programs": [],
  };

  angular.forEach([$scope.hot_programs, $scope.recent_programs, $scope.contest_programs, $scope.top_programs], function(programs_object, key) {
    var programs = programs_object.programs;
    var sort = programs_object.sort;
    $http.jsonp("https://www.khanacademy.org/api/internal/scratchpads/top?casing=camel&topic_id=xffde7c31&sort="+sort+"&limit=20&page=0&callback=JSON_CALLBACK")
    .success(function(data, status, headers, config) {
      angular.forEach(data.scratchpads, function(scratchpad, key) {
        var program = {}
        program.title = scratchpad.title;
        program.id = extract_id_from_url(scratchpad.url);
        program.image = id_to_image_url(program.id);
        program.description = "";
        programs.push(program);
        add_metadata(program, $http);
      });
    });
  });
})

.controller('FavoritesCtrl', function($scope, programsService) {
  $scope.programs = programsService.getFavorites();
})

.controller('AddCtrl', function($scope, $http) {
    /**
     * Called whenever the inputted program URL is updated.
     * Updates the thumbnail and URL of the program whose URL was inputted.
     * TODO(neel): grab more related metadata.
     */
    $scope.onUpdateURL = function(programURL) {
        var programId = extract_id_from_url(programURL);
        $scope.programId = programId;
        $scope.thumbnailUrl = id_to_image_url(programId);
    };
})

.controller('PlayerCtrl', function($scope, $stateParams, $sce) {
    var programId = $stateParams.programId;
    $scope.programId = programId;

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
})

/**
 * Contains all your programs and methods to manage them.
 */
.factory('programsService', function($http) {

    var programs = [];

  var service = {
      /**
       * Adds a new program with the given ID to the list.
       */
      addProgram: function(id) {
          var newProgram = {
              id: id,
              title: "New Program",
              favorite: true,
              image: id_to_image_url(id)
          };
          programs.push(newProgram);
          add_metadata(newProgram, $http);
      },

      /**
       * Returns all programsService
       * @return {Object Array} an array of programs containing id's and other
       *    metadata.
       */
      getFavorites: function() {
          return _.filter(programs, function(program){
              return program.favorite;
          });
      }
  };

  // add in a bunch of default programs
  var defaultIds = [
      6095780544249856,
      5238695889338368,
      5406513695948800,
      6539939794780160
  ];
  _.each(defaultIds, service.addProgram);

  return service;
});



var add_metadata = function(program, $http) {
 // Fetch the values from khanacademy
  $http.jsonp('https://www.khanacademy.org/api/internal/scratchpads/'+program.id+'?callback=JSON_CALLBACK')
  .success(function(data, status, headers, config) {
    program.title = data.title;
    program.description = data.descriptionHtml;
    program.voteCount = data.sumVotesIncremented;
    program.spinoffCount = data.spinoffCount
  });
};

var extract_id_from_url = function(url) {
    // program url is in format
    // https://www.khanacademy.org/computer-programming/[slug]/[id]
    // and we only care about the id
    var urlChunks = url.split("/");
    return urlChunks.slice(-1)[0];
}

var id_to_image_url = function(id) {
    return "https://www.khanacademy.org/computer-programming/ka-player/"+id+"/latest.png";
}
