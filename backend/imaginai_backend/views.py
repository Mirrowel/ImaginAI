from django.http import HttpResponse

def home(request):
    return HttpResponse("ImaginAI Backend is running!")
