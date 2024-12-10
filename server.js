const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();
const PORTA = 3000;
const HOST = '0.0.0.0';

let bancoDeUsuarios = [];
let mensagensDeChat = {};
const historicoDeChat = [];

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), 'assets')));
app.use(session({
    secret: 'minhaChaveSecreta123!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 30
    }
}));

// Definindo as rotas
app.get('/login', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Login</title>
                <link rel="stylesheet" href="/style.css">
            </head>
            <body>
                <div class="container">
                    <h2>Login</h2>
                    <form action="/login" method="POST">
                        <div class="form-group">
                            <label for="username">Nome de Usuário:</label>
                            <input type="text" id="username" name="username" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Senha:</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        <button type="submit">Entrar</button>
                    </form>
                </div>
            </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '1234') {
        req.session.user = username;
        res.cookie('ultimoLogin', new Date().toLocaleString(), { maxAge: 1000 * 60 * 60 * 24 });
        return res.redirect('/');
    }
    res.status(401).send('Login inválido!');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('Ultimo Login');
        res.redirect('/login');
    });
});

app.use((req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
});

app.get('/', (req, res) => {
    const ultimoLogin = req.cookies['ultimoLogin'] || 'Nunca';
    res.send(`
        <html>
            <head>
                <title>Menu Principal</title>
                <link rel="stylesheet" href="/style.css">
            </head>
            <body>
                <div class="container">
                    <h2>Menu Principal</h2>
                    <p>Bem-vindo, ${req.session.user}!</p>
                    <p>Último login: ${ultimoLogin}</p>
                    <ul>
                        <li><a href="/Cadastro">Cadastrar Usuário</a></li>
                        <li><a href="/listaUsuarios">Lista de Usuários</a></li>
                        <li><a href="/chat">Chat</a></li>
                    </ul>
                    <a href="/logout" class="btn">Sair</a>
                </div>
            </body>
        </html>
    `);
});

app.get('/Cadastro', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Cadastro de Usuário</title>
                <link rel="stylesheet" href="/style.css">
            </head>
            <body>
                <div class="container">
                    <h2>Cadastrar Usuário</h2>
                    <form action="/criarUsuario" method="POST">
                        <div class="form-group">
                            <label for="name">Nome:</label>
                            <input type="text" id="name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email:</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="nickname">Apelido:</label>
                            <input type="text" id="nickname" name="nickname" required>
                        </div>
                        <button type="submit">Cadastrar</button>
                    </form>
                    <a href="/" class="btn">Voltar ao Menu</a>
                </div>
            </body>
        </html>
    `);
});

app.post('/criarUsuario', (req, res) => {
    const { name, email, nickname } = req.body;
    if (name && email && nickname) {
        bancoDeUsuarios.push({ name, email, nickname });
        res.redirect('/listaUsuarios');
    } else {
        res.status(400).send('Todos os campos são obrigatórios!');
    }
});

app.get('/listaUsuarios', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Lista de Usuários</title>
                <link rel="stylesheet" href="/style.css">
            </head>
            <body>
                <div class="container">
                    <h2>Lista de Usuários</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Apelido</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bancoDeUsuarios.map(user => `
                                <tr>
                                    <td>${user.name}</td>
                                    <td>${user.email}</td>
                                    <td>${user.nickname}</td>
                                    <td><a href="/enviarMensagem?nickname=${user.nickname}" class="btn">Enviar Mensagem</a></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <a href="/" class="btn">Voltar ao Menu</a>
                </div>
            </body>
        </html>
    `);
});

app.get('/enviarMensagem', (req, res) => {
    const { nickname } = req.query;
    res.send(`
        <html>
            <head>
                <title>Enviar Mensagem para ${nickname}</title>
                <link rel="stylesheet" href="/style.css">
            </head>
            <body>
                <div class="container">
                    <h2>Enviar Mensagem para ${nickname}</h2>
                    <form action="/enviarMensagem" method="POST">
                        <input type="hidden" name="nickname" value="${nickname}">
                        <div class="form-group">
                            <label for="message">Mensagem:</label>
                            <textarea id="message" name="message" rows="4" required></textarea>
                        </div>
                        <button type="submit">Enviar</button>
                    </form>
                    <a href="/listaUsuarios" class="btn">Voltar à Lista de Usuários</a>
                </div>
            </body>
        </html>
    `);
});

app.post('/enviarMensagem', (req, res) => {
    const { nickname, message } = req.body;
    if (!mensagensDeChat[nickname]) {
        mensagensDeChat[nickname] = [];
    }
    mensagensDeChat[nickname].push(message);
    res.redirect(`/enviarMensagem?nickname=${nickname}`);
});

app.get('/chat', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Chat</title>
                <link rel="stylesheet" href="/style.css">
            </head>
            <body>
                <div class="container">
                    <h2>Chat</h2>
                    <ul>
                        ${historicoDeChat.map(msg => `
                            <li>${msg.user}: ${msg.message}</li>
                        `).join('')}
                    </ul>
                    <form action="/chat" method="POST">
                        <div class="form-group">
                            <label for="chatUser">Usuário:</label>
                            <select name="user" id="chatUser" required>
                                ${bancoDeUsuarios.map(user => `
                                    <option value="${user.nickname}">${user.nickname}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="chatMessage">Mensagem:</label>
                            <textarea name="message" id="chatMessage" rows="3" required></textarea>
                        </div>
                        <button type="submit">Enviar</button>
                    </form>
                    <a href="/" class="btn">Voltar ao Menu</a>
                </div>
            </body>
        </html>
    `);
});

app.post('/chat', (req, res) => {
    const { user, message } = req.body;
    historicoDeChat.push({ user, message });
    res.redirect('/chat');
});

app.listen(PORTA, () => console.log(`Servidor rodando em http://localhost:${PORTA}`));
