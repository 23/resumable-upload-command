const { program } = require('commander');
const resumableUpload = require('./resumable-upload')

function printProgress(p) {
  console.log( Math.round(p*1000)/10.0 + '%' );
}

program
  .option('-u, --url <type>', 'Upload URL')
  .option('-d, --domain <type>', 'Upload URL')
  .requiredOption('-t, --token <type>', 'Upload token')
  .requiredOption('-f, --filename <type>', 'Filename');
program.parse(process.argv);
const options = program.opts();

if(options.domain) {
  options.url = 'https://'+options.domain+'/api/2/photo/redeem-upload-token';
}
if(!options.url) {
  throw new Error('Url or domain is required');
}


// node upload.js --filename /Users/steffentchr/Downloads/10834902.mp4 --domain preview.ranguinc.com --token bc7fkpo89D0hV90e8sFmQsSQQ886Y0bOacA2pRvZaZMuNQtFBB1Jxyg36e7OuRcf

resumableUpload(options.filename, options.url, {upload_token:options.token}, {progressCallback:printProgress});