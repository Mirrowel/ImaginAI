from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CardViewSet,
    ScenarioViewSet,
    AdventureViewSet,
    AdventureTurnViewSet,
    GlobalSettingsViewSet,
    ModelViewSet
)

router = DefaultRouter()
router.register(r'cards', CardViewSet)
router.register(r'scenarios', ScenarioViewSet)
router.register(r'adventures', AdventureViewSet)
router.register(r'adventureturns', AdventureTurnViewSet)
router.register(r'global-settings', GlobalSettingsViewSet, basename='global-settings')
router.register(r'models', ModelViewSet, basename='models')

urlpatterns = [
    path('', include(router.urls)),
]
