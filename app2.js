// Mongodb와 express 연결시키기 위한 기초작업
var express = require('express');
var http = require('http');
var static = require('serve-static');
var path = require('path');

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');

// 에러 핸들러 모듈 사용
var expressErrorHandler = require('express-error-handler');

// mongodb 모듈 사용
var MongoClient = require('mongodb').MongoClient;

var database

function connectDB() {
    var databaseUrl = 'mongodb://192.168.0.8:27017/local';

    MongoClient.connect(databaseUrl, function(err, db){
        if (err) {
            console.log('데이터베이스 연결 시 에러 발생함');
            return
        }

        console.log('데이터베이스에 연결됨 : ' + databaseUrl);
        database = db;
        // database = db.db('locals');
    });
}

var app = express();

app.set('port', process.env.port || 3000);
app.use('/public', static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(expressSession({
    secret : 'my key',
    resave : true,
    saveUninitialized : true
}));

var router = express.Router();

router.route('/process/login').post(function(req, res){
    console.log('/process/login 라우팅 함수 호출됨')

    var paramId = req.body.id || req.query.id;
    var paramPassword = req.body.password || req.query.password;
    console.log('요청 파라미터 : ' + paramId + ', ' + paramPassword);

    if(database) {
        authUser(database, paramId, paramPassword, function(err, docs){
            if(err) {
                console.log('에러 발생');
                res.writeHead(200, {"Content-type":"text/html;charset=utf-8"})
                res.write('<h1>에러 발생</h1>')
                res.end();
                return
            }
            if(docs) {
                console.dir(docs);
                res.writeHead(200, {"Content-type":"text/html;charset=utf-8"})
                res.write('<h1>사용자 로그인 성공</h1>')
                res.write('<div><p>사용자 : ' + docs[0].name + '</p></div>');
                res.write('<br><br><a href="/public/login.html">다시 로그인 하기</a>');
                res.end();

            } else {
                console.log('에러 발생');
                res.writeHead(200, {"Content-type":"text/html;charset=utf-8"});
                res.write('<h1>사용자 데이터 조회 안됨</h1>');
                res.end();
            }
        })
    } else {
        console.log('데이터베이스 연결 안됨');
        res.writeHead(200, {"Content-type":"text/html;charset=utf-8"});
        res.write('<h1>데이터베이스 연결 안됨</h1>');
        res.end();
    }
});

router.route('/process/adduser').post(function(req, res){
    console.log('/process/adduser 사용자 추가 함수가 호출됨');

    var paramId = req.body.id || req.query.id;
    var paramPassword = req.body.password || req.query.password;
    var paramName = req.body.name || req.query.name;

    console.log('요청 파라미터 : ' + paramId + ', ' + paramPassword + ', ' + paramName);

    if(database) { 
        addUser(database, paramId, paramPassword, paramName, 
            function(err, result) {
                if (err) {
                    console.log('에러 발생');
                    res.writeHead(200, {"Content-type":"text/html;charset=utf-8"})
                    res.write('<h1>에러 발생</h1>')
                    res.end();
                    return;
                }
                if (result) {
                    console.dir(result);
                    res.writeHead(200, {"Content-type":"text/html;charset=utf-8"})
                    res.write('<h1>사용자 추가 성공</h1>')
                    res.write('<div><p>사용자 : ' + paramName + '</p></div>');
                    res.end();
                } else {
                    console.log('사용자 추가 안됨');
                    res.writeHead(200, {"Content-type":"text/html;charset=utf-8"});
                    res.write('<h1>사용자 추가 안됨</h1>');
                    res.end();
                }
            })
    } else {
        console.log('데이터베이스 연결 안됨');
        res.writeHead(200, {"Content-type":"text/html;charset=utf-8"});
        res.write('<h1>데이터베이스 연결 안됨</h1>');
        res.end();
    }
})


app.use('/', router);

var authUser = function(db, id, password, callback) {
    console.log('authUser 호출됨' + id + ',' + password);
    var users = db.collection('users');
    console.log(users)

    users.find({"id":id, "password":password}).toArray(function(err, docs){
        if(err) {
            callback(err, null);
            return;
        }
        if(docs.length > 0) {
            console.log('일치하는 사용자를 찾음');
            callback(null, docs);
        } else {
            console.log('일치하는 사용자를 찾지 못함');
            callback(null, null);
        }
    });

};

var addUser = function(db, id, password, name, callback) {

    console.log('addUser함수 호출됨 : ' + id + ',' + password + ',' + name);

    var users = db.collection('users');

    users.insertMany([{
        'id' : id,
        'password' : password,
        'name' : name
    }], function(err, result){
        if(err) {
            callback(err, null)
            return;
        }
        if(result.insertedCount > 0){
            console.log('사용자 추가됨 : ' + result.insertedCount);
            callback(null, result)
        } else {
            console.log('추가된 레코드가 없음');
            callback(null, null);
        }
    });
};


var errorHandler = expressErrorHandler({
    static : {
        '404' : './public/404.html'
    }
});

var server = http.createServer(app).listen(app.get('port'), function(){
    console.log('express함수를 실행함 : ' + app.get('port'))
    connectDB();
})