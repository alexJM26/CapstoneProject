import logging

logger = logging.getLogger("app")
logger.setLevel(logging.ERROR)

fileHandler = logging.FileHandler("app.log")
fileHandler.setLevel(logging.ERROR)

formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
fileHandler.setFormatter(formatter)

logger.addHandler(fileHandler)
logging.propagate = False