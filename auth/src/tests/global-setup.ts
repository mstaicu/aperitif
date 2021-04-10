module.exports = async () => {
  /**
   * Provide environment variables
   */
  process.env.SIGNATURE = 'supersecret';
  process.env.MORGAN_LEVEL = 'common';

  try {
    // TODO: Implement test environment creation:
    //  create the in-memory db
    //  connect to the in-memory database
    console.log('\nTest environment creation completed\n');
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
