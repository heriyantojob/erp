import "dotenv/config";
import app from "./server";
import logger from "./utils/logger";
const port = process.env.PORT || 8000;

app.listen(port, () => {
 console.log(`Server is listening at port ${port}`);
 logger.info(`Server Running On Port ${port}`)
});
