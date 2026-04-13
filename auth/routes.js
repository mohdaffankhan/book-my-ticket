import express from "express";
import AuthenticationController from "./controllers.js";
import { restrictToAuthenticatedUser, validate } from "./middleware/auth.middleware.js";
import { SignUpDto, SignInDto } from "./models.js";

const authController = new AuthenticationController();
const router = express.Router();

router.post("/signup", validate(SignUpDto), authController.handleSignUp.bind(authController));
router.post("/signin", validate(SignInDto), authController.handleSignIn.bind(authController));

router.get("/me", restrictToAuthenticatedUser(), authController.handleMe.bind(authController));
router.post("/signout", restrictToAuthenticatedUser(), authController.handleSignOut.bind(authController));
router.post("/refresh/token", authController.refreshToken.bind(authController));

export { router as authRouter };
