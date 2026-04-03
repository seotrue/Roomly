import { test, expect } from '@playwright/test';

test.describe('홈 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('페이지 로드 시 Roomly 타이틀이 보인다', async ({ page }) => {
    await expect(page.locator('.home-logo-text')).toHaveText('Roomly');
    await expect(page.locator('.home-subtitle')).toHaveText('무료 그룹 화상회의');
  });

  test('기본 탭이 "방 만들기"로 활성화되어 있다', async ({ page }) => {
    const createTab = page.locator('.home-tab--active');
    await expect(createTab).toHaveText('방 만들기');
  });

  test('이름 미입력 후 제출 시 에러 메시지가 표시된다', async ({ page }) => {
    await page.locator('.home-submit').click();
    await expect(page.locator('#userName')).toBeVisible();
  });

  test('"방 입장" 탭 클릭 시 방 ID 필드가 나타난다', async ({ page }) => {
    await page.locator('.home-tab', { hasText: '방 입장' }).click();
    await expect(page.locator('#roomId')).toBeVisible();
  });

  test('이름 입력 후 버튼 텍스트가 "방 만들기"이다', async ({ page }) => {
    await page.locator('#userName').fill('테스트유저');
    await expect(page.locator('.home-submit')).toHaveText('방 만들기');
  });
});
