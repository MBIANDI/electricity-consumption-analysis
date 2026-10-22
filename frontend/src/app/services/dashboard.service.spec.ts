import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { makeDashboard } from '../testing/dashboard-fixture';
import { DASHBOARD_URL, DashboardService } from './dashboard.service';

const URL = 'test/dashboard.json';

/** Wait for the resource to apply a flushed response (a pending request would never settle). */
const settle = async (): Promise<void> => {
  TestBed.tick();
  await TestBed.inject(ApplicationRef).whenStable();
};

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DASHBOARD_URL, useValue: URL },
      ],
    });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  it('is loading until the file arrives, then ready', async () => {
    TestBed.tick();
    expect(service.state()).toEqual({ kind: 'loading' });

    const data = makeDashboard();
    http.expectOne(URL).flush(data);
    await settle();

    expect(service.state()).toEqual({ kind: 'ready', data });
  });

  it('is empty when the file holds no day', async () => {
    TestBed.tick();
    http.expectOne(URL).flush({ ...makeDashboard(), daily: [] });
    await settle();

    expect(service.state()).toEqual({ kind: 'empty' });
  });

  it('is in error when the request fails, and can retry', async () => {
    TestBed.tick();
    http.expectOne(URL).flush('missing', { status: 404, statusText: 'Not Found' });
    await settle();
    expect(service.state()).toEqual({ kind: 'error' });

    service.reload();
    TestBed.tick();
    const data = makeDashboard();
    http.expectOne(URL).flush(data);
    await settle();
    expect(service.state()).toEqual({ kind: 'ready', data });
  });
});
