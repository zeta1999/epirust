/*
 * EpiRust
 * Copyright (c) 2020  ThoughtWorks, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

jest.mock('../../db/models/Simulation');
const { handleRequest: handleJobsRequest } = require('../../controllers/job-status-io-controller')
const { Simulation, SimulationStatus } = require('../../db/models/Simulation');

jest.useFakeTimers();

describe('Jobs Status controller', () => {

    afterEach(() => {
        jest.clearAllMocks();
        jest.runOnlyPendingTimers();
    });
    const flushPromises = () => new Promise(setImmediate);
    
    it('should return job status on every 15th second', async () => {
        const jobStatus1 = [{ simulation_id: 1, status: SimulationStatus.INQUEUE }]
        const jobStatus2 = [{ simulation_id: 12, status: SimulationStatus.RUNNING }]
        const jobStatus3 = [{ simulation_id: 123, status: SimulationStatus.FINISHED }]

        //TODO: implement async iterator for the returned value from cursor.
        //this implementation restricts testing close method
        Simulation.find
            .mockReturnValueOnce({ cursor: jest.fn().mockReturnValue(jobStatus1) })
            .mockReturnValueOnce({ cursor: jest.fn().mockReturnValue(jobStatus2) })
            .mockReturnValueOnce({ cursor: jest.fn().mockReturnValue(jobStatus3) })

        const emitSpy = jest.fn(), onHookSpy = jest.fn();
        const mockSocket = { emit: emitSpy, disconnected: false, on: onHookSpy }

        await handleJobsRequest(mockSocket);

        expect(setInterval).toHaveBeenCalledTimes(1)
        expect(setInterval.mock.calls[0][1]).toBe(15000)

        //1
        jest.advanceTimersByTime(15000);
        expect(Simulation.find).toHaveBeenCalledTimes(1)

        await flushPromises()
        expect(emitSpy).toHaveBeenCalledTimes(1)

        //2
        jest.advanceTimersByTime(15000);
        expect(Simulation.find).toHaveBeenCalledTimes(2)

        await flushPromises()
        expect(emitSpy).toHaveBeenCalledTimes(2)

        //3
        jest.advanceTimersByTime(15000);
        // mockSocket.disconnected = true
        expect(Simulation.find).toHaveBeenCalledTimes(3)

        await flushPromises()
        expect(emitSpy).toHaveBeenCalledTimes(3)

        expect(emitSpy.mock.calls).toEqual([
            ["jobStatus", [{ "simulation_id": 1, "status": "in-queue" }]],
            ["jobStatus", [{ "simulation_id": 12, "status": "running" }]],
            ["jobStatus", [{ "simulation_id": 123, "status": "finished" }]]
        ])

        expect(onHookSpy.mock.calls[0][0]).toBe('disconnect');
    });

});