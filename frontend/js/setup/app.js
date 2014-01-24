'use strict';

angular.module('setupApp', []).controller('wizardController', ['$scope', 'setupAPI', function($scope, setupAPI) {
  $scope.settings = {};
  $scope.settings.hostname = null;
  $scope.settings.port = null;
  $scope.settings.dbname = null;
  $scope.step = 0;
  $scope.test = {
    running: false,
    status: 'none',
    err: null
  };
  $scope.record={
    status: 'none',
    err: null,
    running: false
  };

  $scope.ajaxRunning = function() {
    return $scope.record.running || $scope.test.running ? true : false;
  };
  
  $scope.infocomplete = function() {
    return $scope.settings.hostname && $scope.settings.port && $scope.settings.dbname ? true : false;
  };

  $scope.testConnection = function() {
    if ( $scope.ajaxRunning() ) {
      return ;
    }
    $scope.test.running=true;
    setupAPI.testConnection($scope.settings.hostname, $scope.settings.port,$scope.settings.dbname)
      .success(function() {
        $scope.test.status='success';
      })
      .error(function(data) {
        $scope.test.status='error';
        if ( data.err && data.reason ) {
          $scope.test.err=data.error+': '+data.reason;
        } else {
          $scope.test.err=arguments[1]+': '+arguments[0];
        }
      })
      .finally(function() {
        $scope.test.running = false;
      });
  };

  $scope.recordSettings = function() {
    if ( $scope.ajaxRunning() ) {
      return ;
    }
    $scope.record.running = true;
    setupAPI.recordSettings($scope.settings)
      .success(function() {
        $scope.step++;
      })
      .error(function(data){
        $scope.record.status = 'error';
        if( data.error && data.reason ) {
          $scope.record.err = data;
        } else {
          $scope.record.err = {
            error: arguments[1],
            reason: arguments[0]
          };
        }
      })
      .finally(function() {
        $scope.record.running = false;
      });
  };

}]).service('setupAPI', ['$http', function($http) {

    function testConnection(hostname, port, dbname) {
      var url = '/api/setup/database/test/connection/'+
                encodeURIComponent(hostname)+'/'+
                encodeURIComponent(port)+'/'+
                encodeURIComponent(dbname);
      return $http.get(url);
    }

    function recordSettings(settings) {
      return $http.put('/api/setup/settings', settings);
    }

    return {
      testConnection: testConnection,
      recordSettings: recordSettings
    };
  }
]);