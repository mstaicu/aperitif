// @ts-check
import express from "express";

import { authDbConnection } from "../services/index.mjs";

var router = express.Router();

router.get(
  "/healthz",
  /**
   *
   * @param {express.Request} req
   * @param {express.Response} res
   * @param {express.NextFunction} next
   */
  async (req, res, next) => {
    try {
      var authDbConnectionStatus = authDbConnection.readyState;

      console.log(authDbConnectionStatus);

      if (authDbConnectionStatus === 1) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }
    } catch (err) {
      next(err);
    }
  }
);

export { router as healtzRouter };
