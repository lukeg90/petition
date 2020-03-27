const spicedPg = require("spiced-pg");

const db = spicedPg(
    process.env.DATABASE_URL || "postgres:luke:postgres@localhost:5432/petition"
);

exports.addSignature = (user_id, signature) => {
    const q = `
        INSERT INTO signatures (user_id, signature)
        VALUES ($1, $2)
        RETURNING user_id
    `;
    const params = [user_id, signature];
    return db.query(q, params);
};

exports.getUserProfile = id => {
    const q = `
        SELECT first, last, email, age, city, url 
        FROM users
        LEFT JOIN user_profiles
        ON user_profiles.user_id = users.id
        WHERE users.id = $1
    `;
    const params = [id];
    return db.query(q, params);
};

exports.getSignatures = () => {
    const q = `SELECT * FROM signatures`;
    return db.query(q);
};

// needs to be 3 way JOIN
exports.getSigners = () => {
    const q = `
        SELECT first, last, signature, age, city, url
        FROM signatures
        JOIN users
        ON users.id = user_id
        LEFT JOIN user_profiles
        ON user_profiles.user_id = signatures.user_id
    `;
    return db.query(q);
};

exports.getSignersByCity = city => {
    const q = `
        SELECT first, last, signature, age, url 
        FROM signatures
        JOIN users
        ON users.id = user_id
        LEFT JOIN user_profiles
        ON user_profiles.user_id = signatures.user_id
        WHERE LOWER(city) = LOWER($1)
    `;
    const params = [city];
    return db.query(q, params);
};

exports.getSignaturebyUserId = id => {
    const q = `
        SELECT * FROM signatures
        WHERE user_id = $1
    `;
    const params = [id];
    return db.query(q, params);
};

exports.addUser = (first, last, email, hashedPw) => {
    const q = `
        INSERT INTO users (first, last, email, password)
        VALUES ($1, $2, $3, $4)
        RETURNING id
    `;
    const params = [first, last, email, hashedPw];
    return db.query(q, params);
};

exports.getUserByEmail = email => {
    const q = `
        SELECT users.id, password, signature FROM users
        LEFT JOIN signatures
        ON signatures.user_id = users.id
        WHERE email = $1
    `;
    const params = [email];
    return db.query(q, params);
};

exports.addProfile = (age, city, url, id) => {
    const q = `
        INSERT INTO user_profiles (age, city, url, user_id)
        VALUES ($1, $2, $3, $4)
    `;
    const params = [age, city, url, id];
    return db.query(q, params);
};

exports.updateUserAndPassword = (first, last, email, password, id) => {
    const q = `
        UPDATE users 
        SET (first, last, email, password) = ($1, $2, $3, $4)
        WHERE id = $5
    `;
    const params = [first, last, email, password, id];
    return db.query(q, params);
};

exports.updateUser = (first, last, email, id) => {
    const q = `
        UPDATE users 
        SET (first, last, email) = ($1, $2, $3)
        WHERE id = $4
    `;
    const params = [first, last, email, id];
    return db.query(q, params);
};

exports.upsertUserProfile = (age, city, url, id) => {
    const q = `
        INSERT INTO user_profiles (age, city, url, user_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET age=$1, city=$2, url=$3
    `;
    const params = [age, city, url, id];
    return db.query(q, params);
};

exports.deleteSignature = id => {
    const q = `
        DELETE FROM signatures
        WHERE user_id = $1
    `;
    const params = [id];
    return db.query(q, params);
};
