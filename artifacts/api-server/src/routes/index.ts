import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openrouterRouter from "./openrouter";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openrouterRouter);
router.use(searchRouter);

export default router;
