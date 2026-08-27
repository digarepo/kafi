import { describe, expect, it, vi } from 'vitest';

import { AppController } from './app.controller.js';

describe('AppController health endpoints', () => {
  it('keeps liveness independent from the database', () => {
    const db = { execute: vi.fn() };
    const controller = new AppController(db as never);

    expect(controller.getLiveness()).toMatchObject({ status: 'ok' });
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('reports readiness when the database check succeeds', async () => {
    const db = { execute: vi.fn().mockResolvedValue(undefined) };
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const controller = new AppController(db as never);

    await controller.getReadiness(response as never);

    expect(db.execute).toHaveBeenCalledOnce();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ready' }),
    );
  });

  it('reports not ready without exposing the database error', async () => {
    const db = { execute: vi.fn().mockRejectedValue(new Error('secret db detail')) };
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const controller = new AppController(db as never);

    await controller.getReadiness(response as never);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'not_ready' }),
    );
    expect(response.json.mock.calls[0][0]).not.toHaveProperty('message');
  });
});
