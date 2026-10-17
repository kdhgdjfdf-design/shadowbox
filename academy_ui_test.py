"""
اختبار واجهة أكاديمية الكومبو في متصفح حقيقي (Chromium عبر Playwright).
التشغيل:
  cd ShadowBox && python3 -m http.server 8765 &
  python3 tests/academy_ui_test.py

ملاحظة: لا يمكن هنا تحميل MediaPipe من الإنترنت، لذلك لا يختبر هذا الملف
الكشف الحقيقي بالكاميرا. يختبر المسارات: الاختيار، التعلّم، العرض، الجاهزية،
وسلوك الفشل عند تعذّر الكاميرا.
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8765/index.html"
results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS" if cond else "FAIL"), name, detail)


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(BASE, wait_until="domcontentloaded")

        check("الرئيسية ظاهرة عند الفتح", page.is_visible("#homeScreen"))
        check("زر الأكاديمية موجود", page.is_visible("#btnAcademy"))

        page.click("#btnAcademy")
        check("الأكاديمية تفتح", page.is_visible("#academyScreen"))
        check("6 كومبوهات معروضة", page.locator(".ac-card").count() == 6,
              f"count={page.locator('.ac-card').count()}")

        # كومبو قابل للتدريب: جاب → كروس
        page.locator(".ac-card").nth(0).click()
        check("مرحلة التعلّم بعد اختيار الكومبو", page.inner_text("#acPhase") == "تعلّم")
        check("عنوان الخطوة الأولى 1/2", "1/2" in page.inner_text("#acStepTitle"),
              page.inner_text("#acStepTitle"))
        page.wait_for_timeout(600)
        drawn = page.evaluate("""() => {
            const c = document.getElementById('acStage').getContext('2d');
            const d = c.getImageData(0, 0, 640, 480).data;
            let n = 0;
            for (let i = 0; i < d.length; i += 4) {
              if (d[i] > 60 || d[i+1] > 60 || d[i+2] > 60) n++;
            }
            return n;
            }""")
        check("الهيكل المتحرك يُرسم على الكانفس", drawn > 2000, f"pixels={drawn}")

        page.click("#acNext")
        check("الخطوة الثانية 2/2", "2/2" in page.inner_text("#acStepTitle"))

        page.click("#acSlow")
        page.click("#acNext")   # يبدأ العرض الكامل
        check("مرحلة العرض الكامل", page.inner_text("#acPhase") == "عرض")
        page.click("#acPause")
        check("زر الإيقاف يغيّر النص", "متابعة" in page.inner_text("#acPause"))
        page.click("#acPause")
        page.wait_for_function("document.getElementById('acPhase').textContent === 'جاهز'",
                               timeout=20000)
        check("بعد انتهاء العرض تصبح الحالة جاهز", True)
        check("زر المتابعة مفعّل للكومبو القابل للتقييم",
              page.is_enabled("#acContinue"))

        # رجوع ثم كومبو للتعلّم فقط (يحتوي هوك)
        page.click("#acBack")
        check("الرجوع يعيد قائمة الاختيار", page.is_visible("#acSelect"))
        page.locator(".ac-card").nth(2).click()   # i1 جاب → كروس → هوك
        page.click("#acNext")
        page.click("#acNext")
        page.click("#acNext")                     # إلى العرض
        page.wait_for_function("document.getElementById('acPhase').textContent === 'جاهز'",
                               timeout=20000)
        check("كومبو الهوك لا يُفعّل زر التدريب", not page.is_enabled("#acContinue"))
        check("يظهر سبب تعطيل التدريب", "للتعلّم فقط" in page.inner_text("#acGate"))

        # كومبو قابل للتقييم ثم محاولة بدء الكاميرا (ستفشل هنا بسبب الشبكة)
        page.click("#acBack")
        page.locator(".ac-card").nth(0).click()
        page.click("#acNext")
        page.click("#acNext")
        page.wait_for_function("document.getElementById('acPhase').textContent === 'جاهز'",
                               timeout=20000)
        page.click("#acContinue")
        page.wait_for_timeout(500)
        check("أثناء تجهيز الكاميرا تبقى الأكاديمية ظاهرة", page.is_visible("#academyScreen"))
        try:
            page.wait_for_function("document.getElementById('acGate').textContent.trim().length > 0 && document.getElementById('acPhase').textContent === 'جاهز'",
                                   timeout=45000)
            check("عند فشل الكاميرا تعود الأكاديمية وتعرض السبب", True,
                  page.inner_text("#acGate")[:80])
        except Exception as e:  # noqa: BLE001
            check("عند فشل الكاميرا تعود الأكاديمية وتعرض السبب", False, str(e)[:120])
        check("لا تظهر شاشة التدريب بعد الفشل", not page.is_visible("#trainScreen"))

        browser.close()

    print("---")
    print("أخطاء JavaScript غير متوقعة:", errors if errors else "لا توجد")
    passed = sum(1 for _, ok in results if ok)
    print(f"النتيجة: {passed}/{len(results)} نجح")
    sys.exit(0 if passed == len(results) and not errors else 1)


if __name__ == "__main__":
    main()
