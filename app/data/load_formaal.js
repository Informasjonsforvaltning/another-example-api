var http = require('http');
var fs = require('fs');

/*
The formaal.tab file is organized as follows:
- orgnr
- linjenr
- tekst
where 'orgnr' is a unique number of the particular organization, and 'tekst'
contains the text of the formaal.
In the first record for a particular organization, 'linjenr' will equals 10, and 'tekst'
will contain the first part of the formaal. The next record for this organization
will have 'linjenr' equal to 20, and the next part of the formal is in 'tekst'.
*/

fs.readFile( __dirname + '/formaal_head.tab', function (err, data) {
  if (err) {
    throw err;
  }

  // Split data into array by lines:
  var l = data.toString().split('\r\n');
  for (var i = 0; i < l.length; i++) {
    // Split the line into array by tab
    var a = l[i].split('\t');

    // Create a Json object:
    var o;
    if (a[1] === '10' && a[2]) {
      o = JSON.stringify({
        orgnr: a[0], formaal: a[2]
      });
      console.log('Json: ', o);

      // Post the object to our endpoint
      var request = new http.ClientRequest({
        hostname: "localhost",
        port: 8081,
        path: "/organizations",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Lenght": Buffer.byteLength(o)
        }
      });
      request.end(o);
      
    } else if (a[1]){
      console.log('ERROR: orgnr/linjenr', a[0] + '/' + a[1]);
    } else {
      console.log('ERROR: ', i);
    }


  };
});
