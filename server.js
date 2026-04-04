const app = require('./api/index');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Node server running locally on http://localhost:${PORT}`);
    console.log(`Remember to hit http://localhost:${PORT}/api/init to create your table if it doesn't exist.`);
});