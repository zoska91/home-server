import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Esd3dController } from "./esd3d.controller";
import { ContactFormDto, Esd3dService } from "./esd3d.service";

const mockEsd3dService = {
  sendContactForm: vi.fn(),
};

const dto: ContactFormDto = {
  name: "Jan Kowalski",
  email: "jan@example.com",
  quantity: "10",
  material: "PLA",
  message: "Prosze o wycene.",
};

describe("Esd3dController", () => {
  let controller: Esd3dController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [Esd3dController],
      providers: [{ provide: Esd3dService, useValue: mockEsd3dService }],
    }).compile();

    controller = module.get(Esd3dController);
  });

  it("sends contact form and returns ok status", async () => {
    mockEsd3dService.sendContactForm.mockResolvedValue(undefined);

    const result = await controller.sendEmail(dto);

    expect(mockEsd3dService.sendContactForm).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ status: "ok" });
  });
});
