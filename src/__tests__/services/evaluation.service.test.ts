import { jest } from "@jest/globals";
import { EvaluationStatus } from "@prisma/client";

// Mock the prisma module before importing the service
jest.mock("@/lib/prisma");

import { prisma } from "@/lib/prisma";
import { EvaluationService } from "@/server/services/evaluation.service";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("EvaluationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findByEmployee", () => {
    it("returns evaluations for an employee", async () => {
      const mockEvals = [
        {
          id: "eval-1",
          status: EvaluationStatus.SELF_IN_PROGRESS,
          campaign: { name: "Campagne 2025" },
        },
      ];

      (mockPrisma.evaluation.findMany as jest.Mock).mockResolvedValue(mockEvals);

      const result = await EvaluationService.findByEmployee("emp-1");
      expect(result).toEqual(mockEvals);
      expect(mockPrisma.evaluation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ employeeId: "emp-1" }),
        })
      );
    });
  });

  describe("saveSelfEvaluation", () => {
    it("updates status to SELF_SUBMITTED on submit", async () => {
      const mockEval = {
        id: "eval-1",
        status: EvaluationStatus.SELF_IN_PROGRESS,
        employeeId: "emp-1",
        competencyRatings: [],
        objectives: [],
      };

      (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(mockEval);
      (mockPrisma.evaluation.update as jest.Mock).mockResolvedValue({
        ...mockEval,
        status: EvaluationStatus.SELF_SUBMITTED,
      });
      (mockPrisma.$transaction as jest.Mock).mockImplementation((fn: (tx: unknown) => unknown) =>
        fn(mockPrisma)
      );

      const result = await EvaluationService.saveSelfEvaluation("eval-1", "emp-1", {
        comment: "Mon bilan",
        ratings: [],
        submit: true,
      });

      expect(result.status).toBe(EvaluationStatus.SELF_SUBMITTED);
    });

    it("throws if evaluation not found", async () => {
      (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        EvaluationService.saveSelfEvaluation("nonexistent", "emp-1", {
          comment: "",
          ratings: [],
          submit: false,
        })
      ).rejects.toThrow("Évaluation introuvable");
    });

    it("throws if wrong employee tries to edit", async () => {
      (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue({
        id: "eval-1",
        employeeId: "emp-OTHER",
        status: EvaluationStatus.SELF_IN_PROGRESS,
      });

      await expect(
        EvaluationService.saveSelfEvaluation("eval-1", "emp-1", {
          comment: "",
          ratings: [],
          submit: false,
        })
      ).rejects.toThrow();
    });
  });
});
