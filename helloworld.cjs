/*
Copyright (c) Lightstreamer Srl

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var DataProvider = require('lightstreamer-adapter').DataProvider;
var net = require('net');

var HOST = 'localhost';
var PORT = 6663;

var stream = net.createConnection(PORT, HOST);

var dataProvider = new DataProvider(stream);

var greetingsThread;

dataProvider.on('subscribe', function(itemName, response) {
  if (itemName === "greetings") {
    greetingsThread = setTimeout(generateGreetings,0);
    response.success();    
  }
});

dataProvider.on('unsubscribe', function(itemName, response) {
  console.log("Unsubscribed item: " + itemName);
  if (itemName === "greetings") {
    clearTimeout(greetingsThread);
    response.success();
  } 
});

var c = false;
function generateGreetings() {
  c = !c;
  dataProvider.update("greetings", false, {
    'timestamp': new Date().toLocaleString(),
    'message': c ? "Hello" : "World"
  });
  greetingsThread = setTimeout(generateGreetings,1000+Math.round(Math.random()*2000));
}