const fs = require('fs');
const path    = require ('path');
const got = require('got');
const FormData = require('form-data');
const {promisesAllLimit} = require('promises-all-limit')

module.exports = function(filename, url, params, opts) {
  opts = opts||{}
  opts.concurrency = opts.concurrency||5;
  opts.retries = opts.retries||5;
  opts.chunkSize = opts.chunkSize||10*1024*1024;

  const totalSize = fs.lstatSync(filename).size;
  const totalChunks = Math.max(1, Math.floor(totalSize/opts.chunkSize));
  const identifier = path.basename(filename);
  
  const job = {
    url,
    params,
    filename,
    concurrency:opts.concurrency,
    retries:opts.retries,
    chunkSize:opts.chunkSize,
    totalSize,
    totalChunks,
    identifier
  } 

  
  async function uploadChunk(chunkNumber) {
    const form = new FormData();
    const start = (chunkNumber-1)*job.chunkSize;
    if(chunkNumber<job.totalChunks) {
      var end = start+job.chunkSize-1;
    } else {
      var end = job.totalSize-1;
    }
    form.append('file', fs.createReadStream(job.filename, {start, end, autoClose:true}));
    
    form.append('resumableChunkNumber', chunkNumber);
    form.append('resumableTotalChunks', job.totalChunks);
    form.append('resumableChunkSize', job.chunkSize);
    form.append('resumableTotalSize', job.totalSize);
    form.append('resumableIdentifier', job.identifier);
    form.append('resumableFilename', path.basename(job.filename));
    for(k in job.params) {
      form.append(k, job.params[k]);
    }
    return await got.post(job.url, {
      body: form,
      retry: job.retries
    });
  }
  
  const buildUploads = function * () {
    for (let i = 1; i <= job.totalChunks; i++) {
      yield uploadChunk(i);
    }
  }
  
  const run = async () => {
    let finished = 0
    try {
      const results = await promisesAllLimit(
        job.concurrency,
        buildUploads,
        false,
        function(error, result, index) {
          if(result) {
            finished++;
            opts.progressCallback(finished/job.totalChunks);
          } else {
            console.error(error);
          }
        }
      );
      opts.progressCallback(1)
    } catch (error) {
      throw new Error('File upload failed', error);
    }
  };

  opts.progressCallback(0)
  run();
}