// Indefinitely invokes calls to the vote and result applications

const request = require('request');

const INTERVAL = 10000; // poll each service once every INTERVAL milliseconds

const RESULT_URL = 'http://127.0.0.1:4000/';
const VOTE_URL = 'http://127.0.0.1:8080/';

function loadResults() {
 request(RESULT_URL, { }, (err, res, body) => {
  if (err) { return console.log(err); }
  console.log("Loaded results!");
 });
}

function sendVote() {
 const randomNum = Math.floor(Math.random() * 10) + 1;
 const vote = (randomNum % 2 == 0) ? 'a' : 'b';
 const formData = { vote: vote };

 request.post({url:VOTE_URL, formData: formData}, function callback(err, httpResponse, body) {
  if (err) {
    return console.error('Vote POST failed: ', err);
  }
  console.log('Successfully voted for ' + vote);
 });
}

setInterval(() => {
    loadResults();
}, INTERVAL);

setInterval(() => {
    sendVote();
}, INTERVAL);
