import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openrouterRouter from "./openrouter";
import searchRouter from "./search";
import backtestingRouter from "./backtesting";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openrouterRouter);
router.use(searchRouter);
router.use(backtestingRouter);

export default router;
