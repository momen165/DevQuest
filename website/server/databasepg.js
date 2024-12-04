const {Pool} = require('pg');
const bcrypt = require('bcrypt');
// connect to the database
const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    port: 5432,
    password: 'momen165',
    database: 'Devquest2'

});
pool.connect();