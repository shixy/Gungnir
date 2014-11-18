﻿(function () {
  var serverPath = 'https://raw.githubusercontent.com/benqy/Gungnir/master/',
  execPath = require('path').dirname(process.execPath),
  updatePath = execPath + '\\update',
  fs = require('fs'),
  util = require('./helpers/util'),
  when = require('./node_modules/when');
  adv.extend({
    updater: {
      get: function (url) {
        var deferred = when.defer(),
         gzipDeferred = when.defer(),
         https = require('https'),
         BufferHelper = require('./node_modules/bufferhelper'),
         urlOpt = require('url').parse(url);
        var req = null;
        //超时
        var timer = setTimeout(function () {
          req.abort();
          alert('请求失败,可能github被墙了,' + url);
          deferred.resolve();
        }, 120000);
        req = https.get(urlOpt, function (res) {
          var isGzip = !!res.headers['content-encoding'] && !!~res.headers['content-encoding'].indexOf('gzip');
          var bufferHelper = new BufferHelper();
          res.on('data', function (chunk) {
            bufferHelper.concat(chunk);
          });

          res.on('end', function () {
            var text, buffer = bufferHelper.toBuffer();
            clearTimeout(timer);
            //判断是否需要gzip解压缩
            gzipDeferred.promise.then(function (buffer) {
              text = buffer.toString();
              deferred.resolve({
                text: text,
                urlOpt: urlOpt
              });
            });

            if (isGzip) {
              require('zlib').unzip(buffer, function (err, buffer) {
                gzipDeferred.resolve(buffer);
              });
            }
            else {
              gzipDeferred.resolve(buffer);
            }
          });
          res.on('error', function () {
            alert('更新出错!');
          });
        });
        return deferred.promise;
      },
      updateInfo: function (total, curr) {
        adv.msg('===正在更新:' + curr + '/' + total + '===', adv.MSG_LEVEL.warnings);
      },
      install: function (version) {
        var cmd1 = 'xcopy "' + updatePath + '\\app\\*" "' + execPath + '\\app" /s /e /y';
        var cmd2 = 'xcopy "' + updatePath + '\\package.json" "' + execPath + '\\package.json" /s /e /y';
        require("child_process").exec(cmd1);
        require("child_process").exec(cmd2);
        setTimeout(function () {
          require("child_process").exec('rd /q /s "' + updatePath + '"');
        }, 5000);
        adv.msg('===版本:' + version + '更新完成,请重启===')
      },
      checkUpdate: function () {
        var locPackage = require('nw.gui').App.manifest;
        adv.updater.get(serverPath + '/package.json?' + new Date() * 1)
          .then(function (packageData) {
            if (!packageData.text) return;
            var remotePackage = JSON.parse(packageData.text);
            if (remotePackage.version != locPackage.version){
              if (confirm('是否更新到最新版本:' + remotePackage.version)) {
                var totalFile = remotePackage.gungnir.files.length,
                  updateCount = 0;
                adv.updater.updateInfo(totalFile, updateCount);
                remotePackage.gungnir.files.forEach(function (file) {
                  adv.updater.get(serverPath + '/' + file + '?' + new Date() * 1)
                    .then(function (data) {
                      var fullFilename = require('path').resolve(updatePath + '\\' + file);
                      var lfArr = fullFilename.split('\\');
                      var dirName = lfArr.slice(0, lfArr.length - 1).join('\\');
                      if (!fs.existsSync(dirName)) {
                        util.mkdir(dirName, true);
                      }
                      fs.writeFileSync(fullFilename, data.text);
                      fs.writeFileSync(updatePath + '\\package.json', packageData.text);
                      updateCount++;
                      adv.updater.updateInfo(totalFile, updateCount);
                      if (updateCount == totalFile) {
                        adv.updater.install(remotePackage.version);
                      }
                    });
                });
              }
            }
            else {
              adv.msg('当前版本:' + remotePackage.version + ',已经是最新版');
            }
          });
      }
    }
  });
})()