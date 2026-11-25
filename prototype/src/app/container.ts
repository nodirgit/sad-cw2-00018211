import { AccessPolicy } from '../application/services/AccessPolicy';
import { AuthService } from '../application/services/AuthService';
import { BatchProfitService } from '../application/services/BatchProfitService';
import { CrossCheckService } from '../application/services/CrossCheckService';
import { FarmService } from '../application/services/FarmService';
import { FeedService } from '../application/services/FeedService';
import { LightingService } from '../application/services/LightingService';
import { MonitoringService } from '../application/services/MonitoringService';
import { MortalityService } from '../application/services/MortalityService';
import { SlaughterService } from '../application/services/SlaughterService';
import { VoiceEntryService } from '../application/services/VoiceEntryService';
import { BrowserSpeechRecognizer } from '../infrastructure/devices/BrowserSpeechRecognizer';
import { SimulatedLightController } from '../infrastructure/devices/SimulatedLightController';
import { SimulatedSensorProvider } from '../infrastructure/devices/SimulatedSensorProvider';
import { DEMO_DEFAULTS, DEMO_PINS, DEMO_USERS, DemoSeeder, SENSOR_BASELINES, STORAGE_PREFIX } from '../infrastructure/demo/DemoData';
import { InMemoryRepository } from '../infrastructure/persistence/InMemoryRepository';
import { LocalStorageRepository } from '../infrastructure/persistence/LocalStorageRepository';
import {
  farmSerializer,
  feedSerializer,
  financeSerializer,
  mortalitySerializer,
  sessionSerializer,
  supplierSerializer,
} from '../infrastructure/persistence/serializers';
import { RuleBasedVoiceParser } from '../infrastructure/voice/RuleBasedVoiceParser';

/**
 * Composition root: the ONLY place that knows which concrete classes implement
 * the interfaces (DIP). Swap LocalStorageRepository for a database repository,
 * or the simulated devices for real ones, here and nowhere else.
 */
export function buildContainer(storage: Storage = window.localStorage) {
  const key = (name: string) => `${STORAGE_PREFIX}${name}`;

  // Infrastructure
  const users = new InMemoryRepository(DEMO_USERS);
  const farms = new LocalStorageRepository(key('farm'), farmSerializer, storage);
  const suppliers = new LocalStorageRepository(key('suppliers'), supplierSerializer, storage);
  const deaths = new LocalStorageRepository(key('deaths'), mortalitySerializer(users), storage);
  const feed = new LocalStorageRepository(key('feed'), feedSerializer(suppliers), storage);
  const finance = new LocalStorageRepository(key('finance'), financeSerializer, storage);
  const sessions = new LocalStorageRepository(key('sessions'), sessionSerializer, storage);

  const seeder = new DemoSeeder(storage);
  seeder.seedIfEmpty({ farms, suppliers, deaths, feed, finance, sessions });

  // Application
  const policy = new AccessPolicy();
  const auth = new AuthService(users);
  const farm = new FarmService(farms, policy);
  const mortality = new MortalityService(deaths, farm);
  const profit = new BatchProfitService(finance, farm, policy);
  const feedService = new FeedService(feed, suppliers, farm, mortality, profit, policy);
  const slaughter = new SlaughterService(sessions, farm, profit, policy);
  const crossCheck = new CrossCheckService(sessions, profit, policy);
  const voice = new VoiceEntryService(new RuleBasedVoiceParser(), profit);
  const monitoring = new MonitoringService(new SimulatedSensorProvider(SENSOR_BASELINES), farm);
  const lighting = new LightingService(new SimulatedLightController(), farm);

  return {
    auth,
    policy,
    farm,
    mortality,
    feed: feedService,
    profit,
    slaughter,
    crossCheck,
    voice,
    monitoring,
    lighting,
    speech: new BrowserSpeechRecognizer('uz-UZ'),
    demo: { defaults: DEMO_DEFAULTS, pins: DEMO_PINS, reset: () => seeder.reset() },
  };
}

export type Container = ReturnType<typeof buildContainer>;
