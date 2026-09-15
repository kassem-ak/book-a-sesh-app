"""Run: python scripts/check-discovery.py URL [screenshot-directory].
Requires Python Playwright/Chromium. All Supabase requests are mocked; fixture
profiles and anonymous auth are never written to a server.
"""
import base64
import json
from pathlib import Path
import re
import sys
import time
from urllib.parse import unquote, urlparse
from playwright.sync_api import expect, sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173'
ARTIFACTS = Path(sys.argv[2]) if len(sys.argv) > 2 else None
USER = '00000000-0000-4000-8000-000000000099'
DUAL = '00000000-0000-4000-8000-000000000003'
COACHES = [
    {'user_id': '00000000-0000-4000-8000-000000000001',
     'user': {'name': 'Fixture Coach'}, 'sport': {'name': 'Strength'},
     'price_cents': 4550, 'rating_avg': 4.9, 'reviews_count': 2, 'boosted': True},
    {'user_id': DUAL, 'user': {'name': 'Fixture Dual'}, 'sport': {'name': 'Tennis'},
     'price_cents': 3000, 'bio': 'Coach fixture biography'},
]
PARTNERS = [
    {'user_id': '00000000-0000-4000-8000-000000000002',
     'user': {'name': 'Fixture Partner'}, 'sport': {'name': 'Running'},
     'goal': 'A weekly run', 'level': 'Intermediate'},
    {'user_id': DUAL, 'user': {'name': 'Fixture Dual'}, 'sport': {'name': 'Running'},
     'bio': 'Partner fixture biography'},
]

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    failures, requests, held = [], [], []
    data = {'coach_profiles': [], 'partner_profiles': []}
    fail_partners = hold_profiles = False

    def api(route):
        parsed = urlparse(route.request.url)
        if not ('supabase' in parsed.netloc or '/auth/v1/' in parsed.path or '/rest/v1/' in parsed.path):
            route.continue_()
            return
        requests.append((route.request.method, parsed.path, unquote(parsed.query)))
        endpoint = parsed.path.rsplit('/', 1)[-1]
        if hold_profiles and endpoint in ('coach_profiles', 'partner_profiles'):
            held.append(route)
        elif '/auth/v1/' in parsed.path:
            user = {'id': USER, 'aud': 'authenticated', 'role': 'authenticated',
                    'is_anonymous': True, 'user_metadata': {'name': 'Guest'}}
            payload = base64.urlsafe_b64encode(json.dumps({'sub': USER, 'exp': int(time.time()) + 3600}).encode()).decode().rstrip('=')
            route.fulfill(status=200, json={'access_token': f'e30.{payload}.fixture',
                'token_type': 'bearer', 'expires_in': 3600, 'refresh_token': 'fixture-refresh', 'user': user})
        elif fail_partners and endpoint == 'partner_profiles':
            route.fulfill(status=503, json={'message': 'Fixture temporary outage'})
        elif '/rpc/' in parsed.path:
            assert endpoint in ('bootstrap_demo_session', 'current_app_user', 'my_account_role', 'set_community_membership'), endpoint
            route.fulfill(status=200, json='USER' if endpoint == 'my_account_role' else 'admin' if endpoint == 'set_community_membership' else USER)
        elif '/rest/v1/' in parsed.path:
            assert route.request.method in ('GET', 'HEAD'), 'Unexpected content write'
            route.fulfill(status=200, json=data.get(endpoint, []), headers={'content-range': '*/0'})
        else:
            route.abort()

    def new_page(width=390, reduced_motion='no-preference'):
        page = browser.new_page(viewport={'width': width, 'height': 844},
            permissions=['geolocation'], geolocation={'latitude': 52.52, 'longitude': 13.405}, reduced_motion=reduced_motion)
        page.on('pageerror', lambda error: failures.append(str(error)))
        page.route('**/*', api)
        page.goto(URL)
        return page

    def capture(page, name):
        page.wait_for_timeout(400)  # Let the screen's entrance transition finish.
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name + ' horizontal overflow'
        if ARTIFACTS:
            ARTIFACTS.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(ARTIFACTS / f'{name}.png'))
            print(f'Screenshot: {name}.png', flush=True)

    def onboard(page, query='', motion=True):
        expect(page.get_by_role('button', name='Next, choose what you are')).to_be_visible()
        capture(page, 'onboarding-start')
        if motion:
            clip = {'x': 0, 'y': 0, 'width': page.viewport_size['width'], 'height': 200}
            before = page.screenshot(clip=clip)
            page.wait_for_timeout(500)
            assert before != page.screenshot(clip=clip), 'Onboarding gradient does not animate'
        page.get_by_role('textbox', name='Search Coach, Mentor').fill(query)
        page.get_by_role('button', name='Next, choose what you are').click()
        page.get_by_role('radio', name='Coach/Teacher', exact=True).click()
        capture(page, 'onboarding-role')
        page.get_by_role('button', name='Next, choose your area').click()
        capture(page, 'onboarding-area')
        page.get_by_role('button', name='Start browsing as a guest').click()

    page = new_page()
    onboard(page)
    expect(page.get_by_text('No coaches listed yet.')).to_be_visible()
    expect(page.get_by_role('tab')).to_have_count(4)
    expect(page.get_by_role('tab', name='Courts', exact=True)).to_have_count(0)
    capture(page, 'home-empty-dark')
    for theme in ('dark', 'light'):
        page.get_by_role('button', name='Your profile').click()
        expect(page.get_by_role('button', name='My bookings', exact=True)).to_be_visible()
        expect(page.get_by_text('Coach tools', exact=True)).to_have_count(0)
        expect(page.get_by_text('Admin console', exact=True)).to_have_count(0)
        expect(page.get_by_text('Guest', exact=True).first).to_be_visible()
        if theme == 'light':
            page.get_by_role('switch', name='Appearance', exact=True).click()
            expect(page.get_by_text('Light theme', exact=True)).to_be_visible()
        capture(page, f'profile-{theme}')
        page.get_by_role('tab', name='Community', exact=True).click()
        expect(page.get_by_text('No communities yet.')).to_be_visible()
        expect(page.get_by_text('No events scheduled yet.')).to_be_visible()
        capture(page, f'community-empty-{theme}')
        page.get_by_role('tab', name='Chat', exact=True).click()
        expect(page.get_by_text('No conversations yet', exact=True)).to_be_visible()
        expect(page.get_by_text('No session reminders right now.', exact=False)).to_be_visible()
        capture(page, f'chat-empty-{theme}')
        page.get_by_role('button', name='Find people', exact=True).click()
        expect(page.get_by_role('textbox', name='Search Coach, Mentor')).to_be_visible()
        capture(page, f'home-empty-{theme}')
        page.get_by_role('tab', name='Maps', exact=True).click()
        expect(page.get_by_text('Nobody listed in this area yet.')).to_be_visible()
        expect(page.get_by_label('Your current location', exact=True)).to_be_visible()
        if theme == 'dark':
            marker = page.get_by_label('Your current location', exact=True)
            before = marker.screenshot()
            page.wait_for_timeout(350)
            assert before != marker.screenshot(), 'Own-location marker does not animate'
        capture(page, f'maps-empty-{theme}')
        page.get_by_role('tab', name='Discover', exact=True).click()
    page.close()

    page = new_page(width=360, reduced_motion='reduce')
    onboard(page, motion=False)
    expect(page.get_by_text('No coaches listed yet.')).to_be_visible()
    capture(page, 'home-empty-360')
    page.get_by_role('tab', name='Maps', exact=True).click()
    marker = page.get_by_label('Your current location', exact=True)
    expect(marker).to_be_visible()
    before = marker.screenshot()
    page.wait_for_timeout(350)
    assert before == marker.screenshot(), 'Reduced-motion marker still animates'
    capture(page, 'maps-reduced-motion-360')
    page.close()

    data.update(coach_profiles=COACHES, partner_profiles=PARTNERS)
    fail_partners = hold_profiles = True
    page = new_page()
    onboard(page, 'fixture')
    expect(page.get_by_role('textbox', name='Search Coach, Mentor')).to_have_value('fixture')
    page.get_by_role('tab', name='Maps', exact=True).click()
    expect(page.get_by_text('Loading people...')).to_be_visible()
    hold_profiles = False
    for route in held:
        api(route)
    held.clear()
    expect(page.get_by_text('Some profiles could not load. Please try again.')).to_be_visible(timeout=20000)
    fail_partners = False
    page.get_by_role('button', name='Try again', exact=True).click()
    expect(page.get_by_text('No public map locations available yet.')).to_be_visible()
    capture(page, 'maps-fixture-dark')
    page.get_by_role('textbox', name='Search this area').fill('not a match')
    expect(page.get_by_text('Nothing matches that search.')).to_be_visible()
    page.get_by_role('tab', name='Discover', exact=True).click()
    expect(page.get_by_text('Fixture Coach', exact=True)).to_be_visible()
    expect(page.get_by_text('$45.5', exact=True)).to_be_visible()
    expect(page.get_by_text('Some profiles could not load. Please try again.')).to_have_count(0)
    capture(page, 'home-fixture-dark')
    data['communities'] = [{'id': 'fixture-crew', 'slug': 'fixture-crew', 'name': 'Fixture Crew', 'members_count': 1, 'about': 'Fixture community description'}]
    data['events'] = [{'id': f'fixture-event-{i}', 'community_id': 'fixture-crew', 'community': {'slug': 'fixture-crew'},
        'title': f'Fixture event {i}', 'type': 'meetup', 'when_label': 'Tomorrow', 'location': 'Fixture venue'} for i in range(6)]
    page.get_by_role('tab', name='Community', exact=True).click()
    page.get_by_role('button', name='Join Fixture Crew', exact=True).click()
    expect(page.get_by_role('button', name='Leave Fixture Crew', exact=True)).to_be_visible()
    page.get_by_text('Fixture Crew', exact=True).click()
    expect(page.get_by_text('Community news is not available yet.')).to_be_visible()
    page.get_by_role('tab', name='gallery', exact=True).click()
    expect(page.get_by_text('Community photos are not available yet.')).to_be_visible()
    capture(page, 'community-profile-gallery')
    page.get_by_role('tab', name='events', exact=True).click()
    fab = page.get_by_role('button', name='Create event', exact=True)
    expect(fab).to_be_visible()
    capture(page, 'community-events-fab-visible')
    page.mouse.move(200, 550)
    page.mouse.wheel(0, 500)
    page.wait_for_function("el => getComputedStyle(el.parentElement).opacity === '0'", arg=fab.element_handle())
    capture(page, 'community-events-fab-hidden')
    page.mouse.wheel(0, -300)
    page.wait_for_function("el => getComputedStyle(el.parentElement).opacity === '1'", arg=fab.element_handle())
    capture(page, 'community-events-fab-restored')
    page.get_by_role('button', name='Go back', exact=True).click()
    page.get_by_role('tab', name='Discover', exact=True).click()
    page.get_by_text('Partners', exact=True).click()
    expect(page.get_by_text('Fixture Partner', exact=True)).to_be_visible()
    expect(page.get_by_text('Fixture Coach', exact=True)).to_have_count(0)
    page.get_by_text('Fixture Dual', exact=True).click()
    expect(page.get_by_text('Partner fixture biography', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Message to train together', exact=True)).to_be_visible()
    capture(page, 'partner-profile-dark')
    page.get_by_role('button', name='Go back', exact=True).click()
    page.get_by_text('coaches', exact=True).click()
    page.get_by_text('Fixture Dual', exact=True).click()
    expect(page.get_by_text('Coach fixture biography', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name=re.compile('Book a session'))).to_be_visible()
    for invented in ('Session 1', 'Session 2', 'Session 3', 'Certifications', '0.0', '(0 reviews)'):
        expect(page.get_by_text(invented, exact=True)).to_have_count(0)
    capture(page, 'coach-profile-dark')
    page.get_by_role('button', name='Go back', exact=True).click()
    search = page.get_by_role('textbox', name='Search Coach, Mentor')
    search.fill('not a match')
    expect(page.get_by_text('No coaches match your search.')).to_be_visible()
    search.fill('fixture')
    expect(page.get_by_text('Fixture Coach', exact=True)).to_be_visible()
    assert not any('location' in query for _, path, query in requests if path.endswith(('coach_profiles', 'partner_profiles'))), 'Private location selected'
    assert not failures, failures
    browser.close()
    print('Browser check passed: onboarding/search, guest role boundary, mixed/dual-role profiles, retry, map-first load, four tabs, empty community/chat, dark/light mobile layouts, animation, zero page errors.')
