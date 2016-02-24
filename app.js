window.onload = function() {

  // Allow for vendor prefixes.
  window.requestFileSystem = window.requestFileSystem ||
                             window.webkitRequestFileSystem;


  // Create a variable that will store a reference to the FileSystem.
  var filesystem = null;

  // Get references to the page elements.
  var form = document.getElementById('file-form');
  var filenameInput = document.getElementById('filename');
  var contentTextArea = document.getElementById('content');
  var fileLists = document.getElementsByClassName('file-list');
  var messageBox = document.getElementById('messages');


  // A simple error handler to be used throughout this demo.
  function errorHandler(error) {
    console.log(error.message);
  }


  // Request a FileSystem and set the filesystem variable.
  function initFileSystem() {
    // 5 MB
    navigator.webkitPersistentStorage.requestQuota(1024 * 1024 * 5,
      function(grantedSize) {

        // Request a file system with the new size.
        window.requestFileSystem(window.PERSISTENT, grantedSize, function(fs) {
            var d = new Promise(function(resolve, reject){
              fs.root.getDirectory('Documents', {create:true, exclusive:false}, resolve, reject);
            });
            var i = new Promise(function(resolve, reject){
              fs.root.getDirectory('Images', {create:true, exclusive:false}, resolve, reject);
            });
            var n = new Promise(function(resolve, reject){
              fs.root.getDirectory('Notes', {create:true, exclusive:false}, resolve, reject);
            });
            Promise.all([d,i,n]).then(function(result){
              // Update the file browser.
              listFiles();
            }, function(error){
              errorHandler(error);
            })

            // Set the filesystem variable.
            filesystem = fs;

            // Setup event listeners on the form.
            setupFormEventListener();
            uploadImageEventListener();
            saveCanvasEventListener();
        }, errorHandler);

      }, errorHandler);
  }


  function loadFile(fileEntry, type) {
      var name = fileEntry.name;
      var callback;
      if(type == 'documents'){
        fileEntry.file(function(file) {
          var reader = new FileReader();

          reader.onload = function(e){
            filenameInput.value = name;
            contentTextArea.value = this.result;
          }
          reader.readAsText(file);
        }, errorHandler);
      } else if(type == 'images'){
        fileEntry.file(function(file) {
          var reader = new FileReader();

          reader.onload = function(e){
            var thumb = $("<div class='thumbnail'></div>");
            var img = $("<img src='"+this.result+"'></img>");
            thumb.append(img);
            $("#preview-images").html(thumb);
          }
          reader.readAsDataURL(file);
        }, errorHandler);
      } else if(type == 'notes'){
        fileEntry.file(function(file) {
          var reader = new FileReader();

          reader.onload = function(e){
            $("#canvasname").val(name);
            var img = $("<img src='"+this.result+"'></img>");
            $("#preview-canvas").html(img).removeClass('hidden');
            $("#notes-canvas").addClass('hidden');
            $("#notes-form button").prop('disabled', true).addClass('hidden');
          }
          reader.readAsText(file);
        }, errorHandler);
      }
  }

  function fileLi(entry, type){
    var li = $('<li></li>');

    var link = $('<a></a>');
    link.text(entry.name);
    link.addClass('edit-file');
    link.data('type', type.toLowerCase());
    li.append(link);

    var delLink = $('<a></a>');
    delLink.text('[x]');
    delLink.addClass('delete-file');
    li.append(delLink);

    link.on('click', function(e){
      e.preventDefault();
      loadFile(entry, $(this).data('type'))
    })

    delLink.on('click', function(e){
      e.preventDefault();
      deleteFile(entry)
    });

    return li;
  }

  function dirLi(dirEntry){
    var li = document.createElement('li');
    li.innerHTML = dirEntry.name;

    var ul = document.createElement('ul');
    ul.dataset.dirname = dirEntry.name.toLowerCase();
    li.appendChild(ul);

    return li
  }

  function updateUsedMB(){
    navigator.webkitPersistentStorage.queryUsageAndQuota ( 
      function(usedBytes, grantedBytes) {  
          $("#mb-used").text(parseFloat(usedBytes/1048576).toFixed(2));
          $("#mb-granted").text(parseFloat(grantedBytes/1048576).toFixed(2));
          console.log('we are using ', usedBytes, ' of ', grantedBytes, 'bytes');
      }, 
      function(e) { console.log('Error', e);  }
    );
  }

  function listFiles() {
    updateUsedMB();

    $(".file-list").html('<ul></ul>');

    var $ul = $('.file-list ul');

    var buildList = function(directory){
        directory.createReader().readEntries(function(results){
          results.sort().reverse();
          for(var i = 0; i < results.length; i++){
            if(results[i].isFile){
              $ul.find('ul[data-dirname="'+directory.name.toLowerCase()+'"]').append(fileLi(results[i], directory.name));
            } else {
              var dir = dirLi(results[i])
              if(directory.name == ''){
                $ul.append(dir);
              } else {
                $ul.find('ul[data-dirname="'+directory.name.toLowerCase()+'"]').append(dir);
              }
              buildList(results[i]);
            }
          }
        }, errorHandler);
    }
    buildList(filesystem.root)
  }


  // Save a file in the FileSystem.
  function saveFile(dirname, filename, content, filetype) {
    return new Promise(function(resolve, reject){
      filesystem.root.getDirectory(dirname, {create:true, exclusive:false}, function(directoryEntry){

        directoryEntry.getFile(filename, {create: true}, function(fileEntry) {

          fileEntry.createWriter(function(fileWriter) {

            fileWriter.onwriteend = function(e) {
              resolve(e);
            };

            fileWriter.onerror = function(e) {
              console.log('Write error: ' + e.toString());
              reject(e)
            };

            var contentBlob = new Blob([content], {type: filetype});

            fileWriter.write(contentBlob);

          }, reject);

        }, reject);
      }, reject);
    });
  }


  function deleteFile(fileEntry) {
      fileEntry.remove(function(e) {
        // Update the file browser.
        listFiles();

        // Show a deleted message.
        messageBox.innerHTML = 'File deleted!';
      }, errorHandler);
  }


  // Add event listeners on the form.
  function setupFormEventListener() {

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      // Get the form data.
      var filename = filenameInput.value;
      var content = contentTextArea.value;

      // Save the file.
      saveFile('Documents', filename, content, 'text/plain').then(function(result){
        // Clean out the form field.
        filenameInput.value = '';
        contentTextArea.value = '';

        // Show a saved message.
        messageBox.innerHTML = 'File saved!';
        listFiles();
        return;
      }, function(error) {
        errorHandler(error);
        return;
      });
    });

  }

  function previewImages() {
    var gallery = document.getElementById('preview-images');
    gallery.innerHTML = '';
    var files = this.files;
    for(var i=0; i<files.length; i++){
      var file = files[i];
      var imageType = /image.*/;
      if (!file.type.match(imageType)) {
        throw "File type must be an image";
      }

      var thumb = document.createElement("div");
      thumb.classList.add('thumbnail'); 

      var img = document.createElement("img");
      img.file = file;
      thumb.appendChild(img);
      gallery.appendChild(thumb);

      // Using FileReader to display the image content
      var reader = new FileReader();
      reader.onload = (function(aImg) { return function(e) { aImg.src = e.target.result; }; })(img);
      reader.readAsDataURL(file);
    }
  }

  // Add event listeners on the form.
  function uploadImageEventListener() {

    document.getElementById('upload-image').addEventListener('change', previewImages);

    document.getElementById('image-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var promise_arr = [];

      var saveImage = function(file){
        var fr = new FileReader;
        promise_arr.push(
          new Promise(function(resolve, reject){
            fr.onloadend = function() {
              resolve(saveFile('Images', file.name, fr.result, "image/*"));
            };
            fr.onerror = reject;
          })
        );
        fr.readAsArrayBuffer(file);
      }

      // Get the form data.
      var files = document.getElementById('upload-image').files;
      for(var i=0; i<files.length; i++){
        // Save the file.
        var file = files[i];
        saveImage(file);
      }
      Promise.all(promise_arr).then(function(result){
        document.getElementById('upload-image').value = ''
        document.getElementById('preview-images').innerHTML = '';
        // Show a saved message.
        messageBox.innerHTML = 'File saved!';
        listFiles();
        return;
      }, function(error) {
        errorHandler(error);
        return;
      });
    });

  }


  // Add event listeners on the form.
  function saveCanvasEventListener() {

    document.getElementById('notes-form').addEventListener('submit', function(e) {
      e.preventDefault();

      // Get the form data.
      var filename = document.getElementById("canvasname").value;
      var content = stage.toDataURL();

      // Save the file.
      saveFile('Notes', filename, content, 'image/png').then(function(result){
        // Clean out the form field.
        document.getElementById("canvasname").value = '';
        stage.clear();

        // Show a saved message.
        messageBox.innerHTML = 'Note saved!';
        listFiles();
        return;
      }, function(error) {
        errorHandler(error);
        return;
      });
    });

  }

  // Start the app by requesting a FileSystem (if the browser supports the API)
  if (window.requestFileSystem) {
    initFileSystem();
  } else {
    alert('Sorry! Your browser doesn\'t support the FileSystem API :(');
  }
};
