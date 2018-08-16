const logger = require('koa-logger');
const _ = require ('koa-route');
const bodyParser = require('koa-bodyparser');
const Koa = require('koa');
const app = new Koa();
const responseTime = require('response-time');

// only set up statsd if in production:
if(process.env.NODE_ENV === 'production') {
  var StatsD = require('hot-shots');
  const options = {
    "host": "telegraf",
    "port": "8125"
  }
  var metrics = new StatsD(options);
  // Catch socket errors so they don't go unhandled, as explained
  // in the Errors section below
  metrics.socket.on('error', function(error) {
    console.error("Error in socket: ", error);
  });
}

// Metric middleware, cf https://github.com/koajs/koa/blob/master/docs/middleware.gif
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  // In production we send metrics to statsd, otherwise to console
  if(process.env.NODE_ENV === 'production') {
    metrics.timing(`organizations.timer_${ctx.method}_${ctx.url}`, ms);
    metrics.increment(`organizations.counter_${ctx.method}_${ctx.url}`);
    metrics.gauge('organizations.gauge_numberoforganizations', db.length);
  } else {
    console.log(`organizations.timer_${ctx.method}_${ctx.url} - ${ms}`);
  }
});

app.use(logger());
app.use(bodyParser());

const db = [];
var maxId = 0;

// Content negotiation middleware.
// For now we only return application/json
app.use(async (ctx, next) => {
  await next();
  // no body? nothing to format, early return
  if (!ctx.body) return;
  // Check which type is best match by giving
  // a list of acceptable types to `req.accepts()`.
  const type = ctx.accepts('json');
  // accepts json, koa handles this for us,
  // so just return
  if (type === 'json') return;
  // not acceptable
  if (type === false) ctx.throw(406);
});

const organizations = {
  list: (ctx) => {
    // We accept a query on 'organization':
    if (ctx.query.organization) {
      console.log("searching for organization", ctx.query.organization);
      var res = [];
      for (var i = 0; i < db.length; i++) {
        if (db[i].organization && db[i].organization === ctx.query.organization) {
          res.push(db[i]);
        }
      }
      ctx.body = res;
    }
    // We also accept a query on 'beskrivelse':
    else if (ctx.query.beskrivelse) {
      console.log("searching for beskrivelse", ctx.query.beskrivelse);
      var res = [];
      for (var i = 0; i < db.length; i++) {
        if (db[i].beskrivelse && db[i].beskrivelse.toLowerCase().includes(ctx.query.beskrivelse.toLowerCase())) {
          res.push(db[i]);
        }
      }
      ctx.body = res;
    } else {
      ctx.body = db; // otherwise return the whole lot
    }
  },

  create: (ctx) => {
    console.log('Creating: ', ctx.request.body);
    var index = db.push(ctx.request.body);
    db[index-1].id = ++maxId;
    ctx.set('Location', 'http://localhost:8080/organizations/' + ctx.request.body.id);
    ctx.status = 201;
  },

  show: (ctx, id) => {
    var organization = db.find( o => o.id === parseInt(id));
    if (!organization) return ctx.throw(404, 'cannot find that organization');
    ctx.body = organization;
  },

  update: (ctx, id) => {
    console.log('Updating: ', id, ' ', ctx.request.body);
    var organization = db.find( o => o.id === parseInt(id));
    if (!organization) return ctx.throw(404, 'cannot find that organization');
    var index = db.indexOf(organization);
    if (index > -1) {
      db[index] = ctx.request.body;
      db[index].id = organization.id;
    }
    ctx.status = 204;
},

  delete: (ctx, id) => {
    console.log('Deleting: ', id);
    var organization = db.find( o => o.id === parseInt(id));
    if (!organization) return ctx.throw(404, 'cannot find that organization');
    var index = db.indexOf(organization);
    if (index > -1) {
      db.splice(index, 1);
    }
    ctx.status = 204;
  }
};

app.use(_.get('/organizations', organizations.list));
app.use(_.post('/organizations', organizations.create));
app.use(_.get('/organizations/:id', organizations.show));
app.use(_.put('/organizations/:id', organizations.update));
app.use(_.delete('/organizations/:id', organizations.delete));

const server = app.listen(8081, function (){
  console.log('listening on port 8081');
});
module.exports = server;
