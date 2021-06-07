module.exports = {
	PORT: process.env.PORT || 3000,
	MONGO_URL:
		process.env.MONGODB_URI ||
		'mongodb+srv://Damir:Dq7uInQqYf633gxa@botdata.sp9px.mongodb.net/monopoly?retryWrites=true&w=majority',
};
