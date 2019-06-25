/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

$(document).ready(function () {
    prepareLists();

    $('#clearAccount').click(clearAccount);
    $('#defineActivityShow').click(defineActivityModal);
    $('#createAppBundleActivity').click(createAppBundleActivity);
    $('#startWorkitem').click(startWorkitem);

    $('#outputlog').on("click", '.btn-start-translation', startTranslation);
    $('#outputlog').on("click", '.btn-get-manifest', getManifest);
    $('#outputlog').on("click", '.btn-launch-viewer', launchViewer);

    startConnection();
});

function prepareLists() {
    list('activity', '/api/forge/designautomation/activities');
    list('engines', '/api/forge/designautomation/engines');
    list('localBundles', '/api/appbundles');
}

function list(control, endpoint) {
    $('#' + control).find('option').remove().end();
    jQuery.ajax({
        url: endpoint,
        success: function (list) {
            if (list.length === 0)
                $('#' + control).append($('<option>', { disabled: true, text: 'Nothing found' }));
            else
                list.forEach(function (item) { $('#' + control).append($('<option>', { value: item, text: item })); })
        }
    });
}

function clearAccount() {
    if (!confirm('Clear existing activities & appbundles before start. ' +
        'This is useful if you believe there are wrong settings on your account.' +
        '\n\nYou cannot undo this operation. Proceed?')) return;

    jQuery.ajax({
        url: 'api/forge/designautomation/account',
        method: 'DELETE',
        success: function () {
            prepareLists();
            writeLog('Account cleared, all appbundles & activities deleted');
        }
    });
}

function defineActivityModal() {
    $("#defineActivityModal").modal();
}

function createAppBundleActivity() {
    startConnection(function () {
        writeLog("Defining appbundle and activity for " + $('#engines').val());
        $("#defineActivityModal").modal('toggle');
        createAppBundle(function () {
            createActivity(function () {
                prepareLists();
            })
        });
    });
}

function createAppBundle(cb) {
    jQuery.ajax({
        url: 'api/forge/designautomation/appbundles',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            zipFileName: $('#localBundles').val(),
            engine: $('#engines').val()
        }),
        success: function (res) {
            writeLog('AppBundle: ' + res.appBundle + ', v' + res.version);
            if (cb) cb();
        }
    });
}

function createActivity(cb) {
    jQuery.ajax({
        url: 'api/forge/designautomation/activities',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            zipFileName: $('#localBundles').val(),
            engine: $('#engines').val()
        }),
        success: function (res) {
            writeLog('Activity: ' + res.activity);
            if (cb) cb();
        }
    });
}

function startWorkitem() {
    var inputFileField = document.getElementById('inputFile');
    if (inputFileField.files.length === 0) { alert('Please select an input file'); return; }
    if ($('#activity').val() === null) { alert('Please select an activity'); return };
    var file = inputFileField.files[0];
    startConnection(function () {
        var formData = new FormData();
        formData.append('inputFile', file);
        formData.append('data', JSON.stringify({
            width: $('#width').val(),
            height: $('#height').val(),
            activityName: $('#activity').val(),
            browerConnectionId: connectionId
        }));
        writeLog('Uploading input file...');
        $.ajax({
            url: 'api/forge/designautomation/workitems',
            data: formData,
            processData: false,
            contentType: false,
            type: 'POST',
            success: function (res) {
                writeLog('Workitem started: ' + res.workItemId);
            }
        });
    });
}

function startTranslation(e) {
    var urn = $(e.currentTarget).data('object-urn');

    writeLog('Start translation: ' + urn);

    jQuery.ajax({
        url: 'api/forge/modelderivative/job',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            urn: urn
        }),
        success: function (res) {
            writeLog('<button class="btn btn-primary btn-get-manifest" data-object-urn="' + urn + '" style="width: 200px;margin: 5px 0px;">Get Manifest</button>');
        }
    });
}

function getManifest(e) {

    var urn = $(e.currentTarget).data('object-urn');

    jQuery.ajax({
        url: 'api/forge/modelderivative/manifest',
        method: 'GET',
        data: {
            urn: urn
        },
        success: function (res) {
            writeLog('Translation Status: ' + res.status + ', Progress: ' + res.progress);

            if (res.status == 'success') {
                writeLog('<button class="btn btn-primary btn-launch-viewer" data-object-urn="' + urn + '" style="width: 200px;margin: 5px 0px;">Launch Viewer</button>');
                $('#launchViewer').click(launchViewer);
            }
        }
    });
}

function writeLog(text) {
  $('#outputlog').append('<div style="border-top: 1px dashed #C0C0C0">' + text + '</div>');
  var elem = document.getElementById('outputlog');
  elem.scrollTop = elem.scrollHeight;
}

var connection;
var connectionId;

function startConnection(onReady) {
    if (connection && connection.connectionState) { if (onReady) onReady(); return; }
    connection = new signalR.HubConnectionBuilder().withUrl("/api/signalr/designautomation").build();
    connection.start()
        .then(function () {
            connection.invoke('getConnectionId')
                .then(function (id) {
                    connectionId = id; // we'll need this...
                    if (onReady) onReady();
                });
        });

    connection.on("downloadResult", function (url) {
        writeLog('<a href="' + url +'">Download result file here</a>');
    });

    connection.on("onComplete", function (message) {
        writeLog(message);
    });

    connection.on("translateResult", function (urn) {
        writeLog('<button class="btn btn-primary btn-start-translation" data-object-urn="' + urn + '" style="width: 200px;margin: 5px 0px;">Start Translation</button>');
    });
}

var viewerApp;
var viewerDeferred = new jQuery.Deferred();

function launchViewer(e) {

    var urn = $(e.currentTarget).data('object-urn');

    writeLog('launchViewer: ' + urn);

    var options = {
        env: 'AutodeskProduction',
        getAccessToken: getForgeToken
    };

    var documentId = 'urn:' + urn;

    Autodesk.Viewing.Initializer(options, viewerDeferred.promise()
        .then(function () {
            viewerApp = new Autodesk.Viewing.ViewingApplication('forgeViewer');
            viewerApp.registerViewer(viewerApp.k3D, Autodesk.Viewing.Private.GuiViewer3D);
            viewerApp.loadDocument(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
        })
    );
}

function onDocumentLoadSuccess(doc) {
    var viewables = viewerApp.bubble.search({ 'type': 'geometry' });
    if (viewables.length === 0) {
        console.error('Document contains no viewables.');
        return;
    }

    viewerApp.selectItem(viewables[0].data, onItemLoadSuccess, onItemLoadFail);
}

function onDocumentLoadFailure(viewerErrorCode) {
    console.error('onDocumentLoadFailure() - errorCode:' + viewerErrorCode);
}

function onItemLoadSuccess(viewer, item) {
}

function onItemLoadFail(errorCode) {
    console.error('onItemLoadFail() - errorCode:' + errorCode);
}

function getForgeToken(callback) {
    jQuery.ajax({
        url: '/api/forge/oauth/token',
        success: function (res) {
            viewerDeferred.resolve();
            callback(res.access_token, res.expires_in);
        }
    });
}