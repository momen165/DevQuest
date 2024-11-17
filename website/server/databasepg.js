const {Pool} = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    host: 'devquest.postgres.database.azure.com',
    user: 'yazandb',
    port: 5432,
    password: 'admin123@',
    database: 'DevQuestDatabase'

});
pool.connect();