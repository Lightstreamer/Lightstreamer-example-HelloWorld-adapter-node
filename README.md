# Lightstreamer - "Hello World" Tutorial - Node.js Adapter #
<!-- START DESCRIPTION lightstreamer-example-helloworld-adapter-node -->

This article will focus on a Node.js port of the Java Data Adapter illustrated in [Lightstreamer - "Hello World" Tutorial - Java Adapter](https://github.com/Weswit/Lightstreamer-example-HelloWorld-adapter-java). 

## Let's Get Started ##

First, please take a look at the previous installment [Lightstreamer - "Hello World" Tutorial - HTML Client](https://github.com/Weswit/Lightstreamer-example-HelloWorld-client-javascript), which provides some background and the general description of the application. Notice that the front-end will be exactly the same. We created a very simple HTML page that subscribes to the "greetings" item, using the "HELLOWORLD" Adapter. Now, we will replace the "HELLOWORLD" Adapter implementation based on Java with a JavaScript equivalent. On the client side, nothing will change, as server-side Adapters can be transparently switched and changed, as long as they respect the same interfaces. Thanks to this decoupling provided by Lightstreamer Server, we could even do something different. For example, we could keep the Java Adapter on the server side and use Flex, instead of HTML, on the client side. Or we could use the Node.js Adapter on the server side and use Java, instead of HMTL or Flex, on the client side. Basically, all the combinations of languages and technologies on the client side and on the server side are supported.

## Give Me Some Node.js Interfaces! ##

Lightstreamer Server exposes native Java Adapter interfaces. The Node.js interfaces are added through the **Lightstreamer Adapter Remoting Infrastructure** (ARI). Let's have a look at it.

![General architecture](ls-ari.png)

ARI is simply made up of two Proxy Adapters and a **Network Protocol**. The two Proxy Adapters implement the Java interfaces and are meant to be plugged into Lightstreamer Kernel, exactly as we did for our original "HELLOWORLD" Java Adapter. There are two Proxy Adapters because one implements the Data Adapter interface and the other implements the Metadata Adapter interface. Our "Hello World" example uses a default Metadata Adapter, so we only need the **Proxy Data Adapter**.

What does the Proxy Data Adapter do? Basically, it exposes the Data Adapter interface through TCP sockets. In other words, it offers a Network Protocol, which any remote counterpart can implement to behave as a Lightstreamer Data Adapter. This means you can write a remote Data Adapter in C, in PHP, or in COBOL (?!?), provided that you have access to plain TCP sockets.

But - here is some magic - if your remote Data Adapter is based on Node.js, you can forget about direct socket programming, and leverage a ready-made library that exposes a higher level **JavaScript interface**. So, you will simply have to implement this JavaScript interface.

Ok, let's recap... The Proxy Data Adapter converts from a Java interface to TCP sockets. The Node.js library converts from TCP sockets to a JavaScript interface. Clear enough?

<!-- END DESCRIPTION lightstreamer-example-helloworld-adapter-node -->

## Creating the JavaScript Data Adapter ##

We will write a single helloworld.js file containing all the required JavaScript code. Before we start let's use npm to install the lightstreamer-adapter module
```
npm install lightstreamer-adapter
```

Then open your favorite text editor, create the helloworld.js file and start coding.

First we include the modules we need and setup some configuration variables

```js
var DataProvider = require('lightstreamer-adapter').DataProvider;
var net = require('net');

var HOST = 'localhost';
var REQ_RESP_PORT = 6663;
var WRITE_PORT = 6664;
```

Then we create two streams that will be used by our DataProvider to communicate with the Proxy Data Adapter. We use the standard net module to do so:
```js
var reqRespStream = net.createConnection(REQ_RESP_PORT, HOST);
var notifyStream = net.createConnection(WRITE_PORT, HOST);
```

Finally we create our DataProvider instance
```js
var dataProvider = new DataProvider(reqRespStream, notifyStream);
```

At this point the application is kind of ready-ish. It doesn't do anything but "it works".

Now we want to handle the DataProvider events to listen for subscribe/unsubscribe calls and start generating real-time events.

```js
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
```

When the "greetings" item is subscribed to by the first user, the Adapter receives the **subscribe** event and starts generating the real-time data. 
If more users subscribe to the "greetings" item, the subscribe event is not fired anymore. 
When the last user unsubscribes from this item, the Adapter is notified through the **unsubscribe** event. In this case we stop the generating events for that item. 
If a new user re-subscribes to "greetings", the subscribe event is fired again. 
As already mentioned in the previous installment, this approach avoids consuming processing power for items nobody is currently interested in.

The **greetingsThread** function is responsible for generating the real-time events. 
Its code is very simple. We simply call the dataProvider.update method passing in the item name we want to update and a JSON object representing our update containing a message (alternating "Hello" and "World") and the current timestamp. 
The function then calls itself using setTimeout to wait for a random time between 1 and 3 seconds and generate the next event..

You can now save the code in a simple .js file (let's call it helloworld.js) and the remote Data Adapter is ready.

## Deploying the Proxy Adapter ##

Now that our remote Data Adapter is ready, we need to deploy and configure the provided Proxy Adapter within Lightstreamer Server.

Go to the "adapters" folder of your Lightstreamer Server and create a "**ProxyHelloWorld_Node**" folder inside "adapters", and a "**lib**" folder inside "ProxyHelloWorld_Node".

Copy the "ls-proxy-adapters.jar" file from "Lightstreamer/DOCS-SDKs/sdk_adapter_remoting_infrastructure/lib" to "Lightstreamer/adapters/ProxyHelloWorld_Node/lib".

Create a new file in "Lightstreamer/adapters/ProxyHelloWorld_Node", call it "adapters.xml", and use the following contents:

```xml
<?xml version="1.0"?>
 
<adapters_conf id="NODE_HELLOWORLD">
 
  <metadata_provider>
    <adapter_class>com.lightstreamer.adapters.metadata.LiteralBasedProvider</adapter_class>
  </metadata_provider>
 
  <data_provider>
    <adapter_class>com.lightstreamer.adapters.remote.data.RobustNetworkedDataProvider</adapter_class>
    <classloader>log-enabled</classloader>
    <param name="request_reply_port">6663</param>
    <param name="notify_port">6664</param>
  </data_provider>
 
</adapters_conf>
```

You have just deployed a new Java Adapter pair, where the Metadata Adapter is a default one (called [LiteralBasedProvider]((https://github.com/Weswit/Lightstreamer-example-ReusableMetadata-adapter-java))) and the Data Adapter is the Proxy Adapter (called "RobustNetworkedDataProvider"). This Adapter pair will be referenced by the clients as "**NODE_HELLOWORLD**".

As a final configuration, let's tell our Web client to use this new Adapter pair, rather than those we developed in [Lightstreamer - "Hello World" Tutorial - HTML Client](https://github.com/Weswit/Lightstreamer-example-HelloWorld-client-javascript). So just edit the "**index.htm**" page of the Hello World front-end (we deployed it under "Lightstreamer/pages/HelloWorld) and replace:

```js
  var client = new LightstreamerClient(null, "HELLOWORLD");
```

with:

```js
  var client = new LightstreamerClient(null, "NODE_HELLOWORLD");
```

## Running the Application ##

Now we have all the pieces ready. Let's enjoy the results.

Start your Lightstreamer Server. When it's up, run the Node.js Remote Adapter.

```
node helloworld.js
```

Open a browser window and go to: http://localhost:8080/HelloWorld/

## Final Notes ##

The full API references for the languages covered in this tutorial are available from the links below:

- [Node.js Adapter API Reference](http://www.lightstreamer.com/docs/adapter_nodejs_api/index.html)

All the source code described in this article is available in this project.

# See Also #

## Clients Using This Adapter ##
<!-- START RELATED_ENTRIES -->

* [Lightstreamer - "Hello World" Tutorial - HTML Client](https://github.com/Weswit/Lightstreamer-example-HelloWorld-client-javascript)

<!-- END RELATED_ENTRIES -->

## Related Projects ##

* [Lightstreamer - "Hello World" Tutorial - Java Adapter](https://github.com/Weswit/Lightstreamer-example-HelloWorld-adapter-java)
* [Lightstreamer - "Hello World" Tutorial - .NET Adapter](https://github.com/Weswit/Lightstreamer-example-HelloWorld-adapter-dotnet)
* [Lightstreamer - Reusable Metadata Adapters - Java Adapter](https://github.com/Weswit/Lightstreamer-example-ReusableMetadata-adapter-java)

## Lightstreamer Compatibility Notes ##

- Compatible with Lightstreamer Node.js Adapter API version 1 or newer.
