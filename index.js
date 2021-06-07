let app = require("./app");
let config = require("./config");

app.listen(config.PORT, () =>
	console.log(`app listening on port ${config.PORT}`)
);
