//----- Imports -----//
const express = require('express');
const fs = require('fs');
const mysql = require('mysql')


//----- Default Settings -----//
const {
    // Server
    SERVER_PORT = 8080,

    // Database
    DB_HOST = "localhost",
    DB_USER = "widoo",
    DB_PASSWORD = "widoo",
    DB_NAME = "widoo",

    // Security
    APPLICATION_KEY = "mostSecretKeyEver",
    APPLICATION_KEY_HEADER = "application-key",

    // Logs
    LOG_REQUESTS = false
} = process.env;


//----- Logs -----//
require('log-prefix')(() => {
    const today = new Date();
    const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

    return '[' + date + ' ' + time + '] %s'
});


//----- Database -----//
const db = mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    typeCast: (field, useDefaultTypeCasting) => {
        // Casts bytes of size 1 to booleans
        if ((field.type === "BIT") && (field.length === 1)) {
            const bytes = field.buffer();
            return (bytes[0] === 1);
        }
        return (useDefaultTypeCasting());
    }
});

const connectDatabase = (next) => {
    db.connect((err) => {
        if (err) {
            console.info("Connection to database failed")
            throw err;
        }
        console.info("Connected to database");

        migrateDatabase(next)
    });
}

const migrateDatabase = (next) => {
    fs.readFile(
        'init_database.sql',
        (err, sql) => {
            if (err) {
                console.info("Failed to load sql file")
                throw err;
            }

            db.query(
                sql.toString(),
                null,
                (err, res) => {
                    if (err) {
                        console.info("Migrations failed")
                        throw err;
                    }
                    console.info("Migrations done");

                    next?.();
                }
            );
        }
    )
}


//----- Server -----//
const app = express();
app.use(express.json());

const startServer = () => {
    app.listen(
        SERVER_PORT,
        () => {
            console.info("Server started on port %s", SERVER_PORT);
        }
    )
}


//----- Routes -----//
// Reject if invalid application key
app.use((req, res, next) => {
    const applicationKey = req.headers[APPLICATION_KEY_HEADER];
    if (applicationKey) {
        // Reject if the provided key is not matching
        if (applicationKey !== APPLICATION_KEY) {
            console.warn("%s tried to request app with an invalid application key: %s", req.socket.remoteAddress, applicationKey)
            return res.status(401).send({error: "Invalid access key"});
        }
        // Continue if okay
        else {
            // Log request if enabled
            if (LOG_REQUESTS) {
                console.info("%s %s %s", req.method, req.url, JSON.stringify(req.body));
            }

            // Continue
            next();
        }
    }
    // Reject if no application key
    else {
        console.warn("%s tried to request app without application key", req.socket.remoteAddress)
        return res.status(401).send({error: "The header " + APPLICATION_KEY_HEADER + " has to be provided"});
    }
})

app.get('/activities/random', (req, res, next) => {
    db.query(
        "SELECT * FROM activities AS a WHERE a.endDate IS NULL ORDER BY RAND () LIMIT 1",
        (err, results) => {
            if (err) return next(err);

            if (results.length === 0) {
                res.status(404).json();
            } else {
                res.status(200).json(results[0]);
            }
        }
    );
})

app.get('/activities/history', (req, res, next) => {
    db.query(
        "SELECT * FROM activities AS a WHERE a.endDate IS NOT NULL ORDER BY a.endDate DESC",
        (err, results) => {
            if (err) return next(err);
            res.status(200).json(results);
        }
    );
})

app.get('/activities/count', (req, res, next) => {
    const query = "SELECT \n" +
        "COUNT(*) AS total,\n" +
        "SUM(CASE WHEN a.endDate IS NULL THEN 1 ELSE 0 END) AS active,\n" +
        "SUM(CASE WHEN a.endDate IS NOT NULL THEN 1 ELSE 0 END) AS done\n" +
        "FROM activities a;"

    db.query(
        query,
        (err, results) => {
            if (err) return next(err);
            res.status(200).json(results[0]);
        }
    );
})

app.get('/activities/:id', (req, res, next) => {
    const activityId = parseInt(req.params.id);

    db.query(
        "SELECT * FROM activities WHERE id = ?",
        [activityId],
        (err, results) => {
            if (err) return next(err);

            if (results.length === 0) {
                res.status(404).json();
            } else {
                res.status(200).json(results[0]);
            }
        }
    )
})

app.put('/activities/:id/done', (req, res, next) => {
    const activityId = parseInt(req.params.id);

    db.query(
        "UPDATE activities AS a SET a.endDate = now() WHERE a.id = ?",
        activityId,
        (err) => {
            if (err) return next(err);
            res.status(200).json();
        }
    )
})

app.post('/activities', (req, res, next) => {
    // Read body
    const activity = {
        name: req.body.name,
        description: req.body.description,
        repeatable: req.body?.repeatable ?? false,
    };

    // Check content
    if (!activity.name) {
        res.status(400)
            .json({
                type: "INVALID_INPUT",
                field: "name",
                message: "Un nom doit être fourni"
            })
    }
    if (activity.name.length < 3) {
        res.status(400)
            .json({
                type: "INVALID_INPUT",
                field: "name",
                message: "Le nom doit contenir au moins 3 charactères"
            })
    } else if (activity.name.length > 62) {
        res.status(400)
            .json({
                type: "INVALID_INPUT",
                field: "name",
                message: "Le nom doit contenir au maximum 62 charactères"
            })
    } else if (activity.description.length > 2048) {
        res.status(400)
            .json({
                type: "INVALID_INPUT",
                field: "description",
                message: "La description doit contenir au maximum 2048 charactères"
            })
    } else {
        // Save data
        db.query(
            "INSERT INTO activities(name, description, repeatable) VALUES (?, ?, ?)",
            [
                activity.name,
                activity.description,
                activity.repeatable ? 1 : 0
            ],
            (err) => {
                if (err) return next(err);

                res.status(201).json();
            }
        );
    }
})

//----- Error handling ------//
app.use((err, req, res) => {
    console.error(err.stack);
    res.status(500).send({error: err});
})


//----- Add stop listeners -----//
process.on('SIGINT', () => {
    console.info('Stop signal received');
    db.end(false, () => {
        console.info('Database connection closed');
        process.exit(0);
    });
});


//----- Start server -----//
console.info("Starting Widoo...")
connectDatabase(() =>
    startServer()
)
