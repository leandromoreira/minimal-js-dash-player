var onError = function(xhr, errorType, e){console.log('Error: ', e)}
var video, descriptor, mediaSource, videoSource = null
var index = 0, lastTime = 0

function constructor() { download('/episodes_dash.mpd', init) }

function download(url, cb) { $.ajax({url: url, success: cb, error: onError}) }

function init(xmlDescriptor) {
  descriptor = parse(xmlDescriptor)
  mediaSource = new MediaSource()
  video = $('#player')[0]

  video.pause()
  video.src = URL.createObjectURL(mediaSource)
  video.width = descriptor.width
  video.height = descriptor.height

  mediaSource.addEventListener('sourceopen', readyToBuffer, false)
}

function parse(xmlData) {
  var mdp = {}
  var xml = new DOMParser().parseFromString(xmlData, 'text/xml')
  var inializations = xml.querySelectorAll('Initialization')

  mdp.init = {}
  mdp.init.range = inializations[0].getAttribute('range')
  mdp.init.baseURL = xml.querySelectorAll('BaseURL')[0].textContent.toString()

  var rep = xml.querySelectorAll("Representation");
  mdp.mimeType = rep[0].getAttribute("mimeType");
  mdp.codecs = rep[0].getAttribute("codecs");
  mdp.width = rep[0].getAttribute("width");
  mdp.height = rep[0].getAttribute("height");
  mdp.bandwidth = rep[0].getAttribute("bandwidth");

  mdp.segmentURL = xml.querySelectorAll('SegmentURL')
  return mdp
}

function readyToBuffer() {
  var listenToUpdate = function(){videoSource.addEventListener('update', updateBuffer)}
  var updateAndAppend = function(data){appendBuffer(data); listenToUpdate()}

  videoSource = mediaSource.addSourceBuffer(descriptor.mimeType + '; codecs=' + descriptor.codecs)

  downloadVideoChunk(descriptor.init.range, updateAndAppend)
}

function downloadVideoChunk(range, cb) {
  $.ajax({
    url: descriptor.init.baseURL,
    headers: {'Range': 'bytes=' + range},
    dataType: 'arraybuffer',
    success: cb || appendBuffer,
    error: onError
  })
}

function appendBuffer(data) {
  console.log(data.length)
  videoSource.appendBuffer(new Uint8Array(data))
}


function updateBuffer() {
  getStarted()
  videoSource.removeEventListener('update', updateBuffer)
}

function getStarted() {
  downloadVideoChunk(descriptor.segmentURL[index++].getAttribute('mediaRange').toString())

  video.addEventListener('timeupdate', downloadSegments)
}

function downloadSegments() {
  if (index < descriptor.segmentURL.length) {
    if ((video.currentTime - lastTime) <= 5) {
      downloadVideoChunk(descriptor.segmentURL[index++].getAttribute('mediaRange').toString())
      lastTime = video.currentTime
    }
  } else {
    video.removeEventListener('timeupdate', downloadSegments)
  }
}

constructor()
