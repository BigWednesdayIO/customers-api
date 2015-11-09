'use strict';

require('./lib/server')((err, server) => {
  if (err) {
    return console.error(err);
  }

  server.start(err => {
    if (err) {
      return console.error(err);
    }

    console.log('Server listening on port', server.info.port);
  });
});
