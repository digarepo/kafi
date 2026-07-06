import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {

  @Get()
  getRoot() {
    return {
      name: "API",
      version: "1.0.0",
      status: "operational",
    };
  }

  @Get("health")
  getHealth() {
    return {
      status: "ok!",
      timestamp: new Date().toISOString()
    };
  }
}
