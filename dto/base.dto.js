import { z } from "zod";

class BaseDto {
  static schema = z.object({});

  static async validate(data) {
    return await this.schema.parseAsync(data);
  }
}

export default BaseDto;