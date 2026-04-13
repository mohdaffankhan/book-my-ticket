import { z } from "zod";
import BaseDto from "../dto/base.dto.js";

export class SignUpDto extends BaseDto {
  static schema = z.object({
    username: z.string().min(1, "Username is required"),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
  });
}

export class SignInDto extends BaseDto {
  static schema = SignUpDto.schema.pick({
    email: true,
    password: true,
  });
}

export class EmailDto extends BaseDto {
  static schema = SignUpDto.schema.pick({
    email: true,
  });
}