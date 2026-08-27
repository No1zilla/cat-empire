import assert from 'node:assert';
import { claimReferral, isFreshInvitee, REFERRAL_REWARD } from '../../server/src/services/referralService.js';
import { telegramInviteLink, parseReferralParam, TG_BOT_USERNAME } from '../../src/config/telegram.js';

function harness({ users = {}, links = new Set() } = {}) {
  const grants = [];
  return {
    grants,
    links,
    deps: {
      getUser: async (key) => (Object.prototype.hasOwnProperty.call(users, key) ? users[key] : null),
      insertLink: async (invitee) => {
        if (links.has(invitee)) return false;
        links.add(invitee);
        return true;
      },
      grant: async (key, amount) => { grants.push([key, amount]); }
    }
  };
}

const NEWBIE = { maxCatLevel: 1, totalMerges: 0, totalCatsBought: 0 };
const VETERAN = { maxCatLevel: 7, totalMerges: 40, totalCatsBought: 120 };

export async function runReferralTests() {
  console.log('🧪 Тестирование приглашений друзей...');

  // Ссылка и разбор параметра — то, что видит игрок.
  assert.strictEqual(
    telegramInviteLink('4242'),
    `https://t.me/${TG_BOT_USERNAME}?startapp=ref_4242`
  );
  assert.strictEqual(parseReferralParam('ref_4242'), '4242');
  assert.strictEqual(parseReferralParam('ref_abc'), '', 'Из параметра берём только цифры');
  assert.strictEqual(parseReferralParam('чужой_параметр'), '', 'Посторонний start_param не считается приглашением');
  assert.strictEqual(telegramInviteLink(''), `https://t.me/${TG_BOT_USERNAME}`);

  assert.strictEqual(isFreshInvitee(NEWBIE), true);
  assert.strictEqual(isFreshInvitee(VETERAN), false);

  // --- Обычный случай: новичок пришёл по ссылке, рубины получают оба ---
  const ok = harness({ users: { 'tg:100': NEWBIE, 'tg:200': VETERAN } });
  const granted = await claimReferral({ inviteeKey: 'tg:100', referrerId: '200' }, ok.deps);
  assert.strictEqual(granted.status, 'granted');
  assert.deepStrictEqual(
    ok.grants,
    [['tg:100', REFERRAL_REWARD], ['tg:200', REFERRAL_REWARD]],
    'Награду получают и приглашённый, и пригласивший'
  );

  // --- Повтор не начисляет второй раз ---
  const repeat = await claimReferral({ inviteeKey: 'tg:100', referrerId: '200' }, ok.deps);
  assert.strictEqual(repeat.status, 'already_claimed');
  assert.strictEqual(ok.grants.length, 2, 'Второго начисления не произошло');

  // --- Себя пригласить нельзя ---
  const self = harness({ users: { 'tg:100': NEWBIE } });
  assert.strictEqual(
    (await claimReferral({ inviteeKey: 'tg:100', referrerId: '100' }, self.deps)).status,
    'self_invite'
  );
  assert.strictEqual(self.grants.length, 0);

  // --- Ветеран не может «прийти по ссылке» ради рубинов ---
  const farm = harness({ users: { 'tg:300': VETERAN, 'tg:200': VETERAN } });
  assert.strictEqual(
    (await claimReferral({ inviteeKey: 'tg:300', referrerId: '200' }, farm.deps)).status,
    'not_fresh'
  );
  assert.strictEqual(farm.grants.length, 0, 'Игрок с прогрессом награды не получает');

  // --- Выдуманный пригласивший ---
  const ghost = harness({ users: { 'tg:100': NEWBIE } });
  assert.strictEqual(
    (await claimReferral({ inviteeKey: 'tg:100', referrerId: '999999' }, ghost.deps)).status,
    'unknown_referrer'
  );
  assert.strictEqual(ghost.grants.length, 0);

  // --- Мусор вместо параметра ---
  const junk = harness({ users: { 'tg:100': NEWBIE } });
  assert.strictEqual((await claimReferral({ inviteeKey: 'tg:100', referrerId: '' }, junk.deps)).status, 'bad_request');
  assert.strictEqual((await claimReferral({ inviteeKey: '', referrerId: '200' }, junk.deps)).status, 'bad_request');

  console.log('  ✅ Приглашение засчитывается один раз, себя и ветеранов не проведёшь');
}
