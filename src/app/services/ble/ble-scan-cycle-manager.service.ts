import { Injectable } from '@angular/core';
import _ from 'lodash';
import {CgPeripheral} from './cg-peripheral.class';
import to from 'await-to-js';
import {CdvBluetoothLeService} from './cdv-bluetooth-le.service';
import {CgAdvertisementScannerService} from './cg-advertisement-scanner.service';
import {CgAdvertisementFactoryService} from './cg-advertisement-factory.service';
import {CgPeripheralManagerService} from './cg-peripheral-manager.service';
import {CgUserManagerService} from './cg-user-manager.service';
import {Subject} from 'rxjs';
import { LogManager } from '../log.service';

@Injectable({
  providedIn: 'root'
})
export class BleScanCycleManagerService {
    private log = new LogManager('BleScanCycleManagerService');

  constructor(
      private cGAdvertisementScannerService: CgAdvertisementScannerService,
      private cGAdvertisementFactoryService: CgAdvertisementFactoryService,
      private cgPeripheralManagerService: CgPeripheralManagerService,
      private cgUserManagerService: CgUserManagerService

  ) { }

  public startScanCycle(): void {



      this.cgPeripheralManagerService.peripheralsUpdated$
          .subscribe(async ({ allPeripherals: periByAddr, cgPeripheralsReceivedInLastScan }) => {
              try {

                  this.log.error('ffr', '--------------------------------------------------');
                  this.log.error('ffr', 'PERIPHERALS');
                  this.log.error('ffr', '--------------------------------------------------');
                  _.each(periByAddr, (peri: CgPeripheral, addr) => {
                      this.log.error(
                          'ffr', 'peri#', addr,
                          'seen', peri.getLastSeenReadableSec(), 'secs ago',
                          peri.getUserId());
                  });


                  this.log.error('ffr', '--------------------------------------------------');
                  this.log.error('ffr', 'DROP OLD PERIPHERAL ENTRIES');
                  this.log.error('ffr', '--------------------------------------------------');
                  const peris: CgPeripheral[] = _.values(periByAddr);
                  for (let i = 0, ii = peris.length; i < ii; i += 1) {
                      const peri = peris[i];
                      const maxPeripheralAgeMs = 200 * 1000;
                      if (peri.isOlderThenMs(maxPeripheralAgeMs)) {
                          this.log.error('ffr', 'Dropping peripheral ', peri.address);
                          await this.cgPeripheralManagerService.dropPeripheralByAddress(peri.address);
                      }
                  }


                  this.log.error('ffr', '------------------------------------------------------');
                  this.log.error('ffr', 'RETRIEVING USER IDs FOR PERIPHERALS RECEIVED LAST SCAN');
                  this.log.error('ffr', '------------------------------------------------------');
                  for (let i = 0, ii = cgPeripheralsReceivedInLastScan.length; i < ii; i += 1) {
                      const peri: CgPeripheral = cgPeripheralsReceivedInLastScan[i];

                      await peri.retrieveUserId();

                      if (peri.didExtractUserId()) {
                          this.cgUserManagerService.createOrUpdateUser(peri);
                      }
                  }




                  //
                  // this.log.error('ffr', '--------------------------------------------------');
                  // this.log.error('ffr', 'Drop DEAD USERS');
                  // this.log.error('ffr', '--------------------------------------------------');
                  //
                  // const maxAgeSec = 3 * 60;
                  // this.cgUserManagerService.dropUsersOlderThanSec(maxAgeSec);



                  this.cgUserManagerService.notifySystemOfUpdatedNearbyUsers();





              } catch (e) {
                  // this.log.error('ffr', 'error', JSON.stringify(e));
                  this.log.error('ffr', 'error in scan cycle aa: ');
                  this.log.error(e);
              }
          });


      this.cGAdvertisementScannerService.startScanningForCgAdvertisement();



      this.cGAdvertisementScannerService.cgScanCycleWorthOfScanResps$
          .subscribe( async (scanResponses: []) => {
              this.log.error('ffr', 'scan response count: ', scanResponses.length);

              if (scanResponses && scanResponses.length) {

                  let addrs = _.map(scanResponses, 'address');
                  addrs = _.uniq(addrs);
                  this.log.error('ffr', 'got scan responses', JSON.stringify(addrs));


                  this.cgPeripheralManagerService.feedWithScanResponses(scanResponses);

              }

          });

  }

}
