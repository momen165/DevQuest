const {Pool} = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    host: 'devquest.postgres.database.azure.com',
    user: 'yazandb',
    port: 5432,
    password: 'momen165',
    database: 'Devquest'

});
pool.connect();