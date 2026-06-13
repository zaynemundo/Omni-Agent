import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openrouterRouter from "./openrouter";
import searchRouter from "./search";
import backtestingRouter from "./backtesting";
import memoryRouter from "./memory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openrouterRouter);
router.use(searchRouter);
router.use(backtestingRouter);
router.use(memoryRouter);

export default router;
