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

.controller('FavoritesCtrl', function($scope) {
  $scope.programs = [
    { title: 'Guess My Number', id: 6095780544249856 },
    { title: 'Squirtle', id: 6539939794780160 }
  ];
})

.controller('AddCtrl', function($scope, $http) {
    $scope.updateProgramId = function() {
        programId = $scope.form.programId;
        // TODO(chelsea): Accept URLS as well as Ids
        // TODO(chelsea): Fetch the specific program ID
        var config = {headers: {"Accept": "image/png"}};
        $http.get('https://www.khanacademy.org/computer-programming/asdf/6539939794780160/5649050225344512.png', config).
            success(function(data, status, headers, config) {
                alert("Success!");
            }).
            error(function(data, status, headers, config) {
                alert("Error!");
            });
        
    }
    $scope.form = {}
})

.controller('PlayerCtrl', function($scope, $stateParams, $sce) {
    var programId = $stateParams.programId;
    $scope.programId = programId;
    $scope.url = $sce.trustAsResourceUrl("https://www.khanacademy.org/computer-programming/guess-my-number/" + programId + "/embedded?embed=yes&article=yes&editor=no&buttons=no&author=no&autoStart=yes&width=400&height=400");
});
