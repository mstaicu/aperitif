module.exports = async () => {
  try {
    // TODO: Implement tear down:
    //  close connections to the in-memory database
    //  close the in-memory db
    console.log('\nTest environment tear down completed\n');
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
