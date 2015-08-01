angular.module("ka-player.directives", [
    'LocalStorageModule'
])

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
      templateUrl: "templates/ion-search.html"
  };
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
