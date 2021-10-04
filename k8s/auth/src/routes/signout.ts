import express from "express";

const router = express.Router();

/**
 * $ http POST http://ticketing/api/auth/signout Cookie:express:sess=eyJqd3QiOiJleUpoYkdjaU9pSklVekkxTmlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKemRXSWlPaUkyTURZNE56QXpabU13TVRaaVlUQXdNekJqT0dReE16WWlMQ0pwWVhRaU9qRTJNVGMwTmpBNE56aDkuTzBObVQxelg3dS01eXdDOWFvdW9seDdvSmVFSUxGa3BfVGNfeGVBbkc2USJ9
 */
router.post("/signout", (req, res) => {
  req.session = null;
  res.send({});
});

export { router as signoutRouter };
